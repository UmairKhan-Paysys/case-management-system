import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { SubmitAlertDto } from './dto/submit-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { AuditLogService } from '../audit/auditLog.service';
import { AlertStatus, Priority } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TriageService {
  private readonly logger = new Logger(TriageService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditLogService,
  ) {}

  /**
   * TAZAMA Implementation: Extract Tenant ID and Transaction Type from Transaction Object
   * 
   * This method implements the TAZAMA TAZ-5 TAZ-271 requirements:
   * - Each alert payload contains a transaction object with tenantId and txTp fields
   * - The ingestion service correctly parses and extracts these fields
   * - Missing or malformed tenantId or txTp values result in alert rejection and error logging
   * - Extracted tenantId is used to associate the alert with the correct tenant workspace
   * - Extracted txTp is used for rule evaluation, categorization, or enrichment
   * 
   * @param dto - Alert submission data containing transaction object
   * @param userId - User ID from JWT token
   * @param tenantId - Tenant ID from JWT token for security validation
   * @returns Created alert with extracted transaction data
   */
  async handleNewAlert(dto: SubmitAlertDto, userId: string, tenantId: string) {
    // TAZAMA Implementation: Extract and validate tenantId and txTp from transaction object
    let extractedTenantId = '';
    let extractedTxTp = '';

    // ACCEPTANCE CRITERIA 1: Each alert payload contains a transaction object with tenantId and txTp fields
    if (!dto.result?.transaction) {
      this.logger.error('Transaction object is missing in alert payload', {
        userId,
        tenantId,
      });

      await this.audit.logAction({
        userId,
        operation: 'ALERT_VALIDATION_FAILED',
        entityName: 'Alert',
        actionPerformed: 'Alert submission rejected due to missing transaction object',
        outcome: 'FAILED',
      });

      throw new BadRequestException('Transaction object is missing in alert payload');
    }

    const transaction = dto.result.transaction as any;
    
    // ACCEPTANCE CRITERIA 2 & 3: The ingestion service correctly parses and extracts these fields
    // Missing or malformed tenantId or txTp values result in alert rejection and error logging
    
    // Extract and validate tenantId from transaction object
    if (!transaction.tenantId || typeof transaction.tenantId !== 'string' || transaction.tenantId.trim() === '') {
      this.logger.error('Missing or malformed tenantId in transaction object', {
        transaction: dto.result.transaction,
        userId,
        tenantId,
      });

      await this.audit.logAction({
        userId,
        operation: 'ALERT_VALIDATION_FAILED',
        entityName: 'Alert',
        actionPerformed: 'Alert submission rejected due to missing or malformed tenantId in transaction object',
        outcome: 'FAILED',
      });

      throw new BadRequestException('Missing or malformed tenantId in transaction object');
    }

    extractedTenantId = transaction.tenantId.trim();
    
    // ACCEPTANCE CRITERIA 4: Extracted tenantId is used to associate the alert with the correct tenant workspace
    // Security validation: JWT tenant ID must match transaction tenant ID for tenant isolation
    if (extractedTenantId !== tenantId) {
      this.logger.error('Tenant ID mismatch between transaction and JWT token', {
        transactionTenantId: extractedTenantId,
        jwtTenantId: tenantId,
        userId,
      });

      await this.audit.logAction({
        userId,
        operation: 'ALERT_VALIDATION_FAILED',
        entityName: 'Alert',
        actionPerformed: `Alert submission rejected due to tenant ID mismatch: transaction=${extractedTenantId}, jwt=${tenantId}`,
        outcome: 'FAILED',
      });

      throw new BadRequestException('Tenant ID mismatch between transaction and JWT token');
    }

    // ACCEPTANCE CRITERIA 5: Extracted txTp is used for rule evaluation, categorization, or enrichment
    // Extract and validate txTp from transaction object
    if (!transaction.txTp || typeof transaction.txTp !== 'string' || transaction.txTp.trim() === '') {
      this.logger.error('Missing or malformed txTp in transaction object', {
        transaction: dto.result.transaction,
        userId,
        tenantId,
      });

      await this.audit.logAction({
        userId,
        operation: 'ALERT_VALIDATION_FAILED',
        entityName: 'Alert',
        actionPerformed: 'Alert submission rejected due to missing or malformed txTp in transaction object',
        outcome: 'FAILED',
      });

      throw new BadRequestException('Missing or malformed txTp in transaction object');
    }

    extractedTxTp = transaction.txTp.trim();

    this.logger.log('TAZAMA: Transaction data extracted successfully', {
      tenantId: extractedTenantId,
      txTp: extractedTxTp,
      userId,
    });

    // Determine the alert source
    let source = '';
    if (
      dto.result &&
      typeof dto.result.source === 'string' &&
      dto.result.source
    ) {
      source = dto.result.source;
    } else if (
      dto.result &&
      dto.result.report &&
      typeof (dto.result.report as any).source === 'string' &&
      (dto.result.report as any).source
    ) {
      source = (dto.result.report as any).source;
    }

    // TAZAMA Implementation: Create alert using extracted transaction data
    try {
      const alert = await this.prisma.alert.create({
        data: {
          tenant_id: extractedTenantId, // ACCEPTANCE CRITERIA 4: Use extracted tenantId for tenant workspace association
          priority: Priority.LOW,
          source: source,
          txtp: extractedTxTp, // ACCEPTANCE CRITERIA 5: Use extracted txTp for rule evaluation and categorization
          alert_status: AlertStatus.NEW,
          message: String(dto.result.message),
          alert_data: dto.result.report,
          transaction: dto.result.transaction,
          network_map: dto.result.networkMap,
          confidence_per: 0,
        },
      });
      await this.audit.logAction({
        userId,
        operation: 'ALERT_CREATED',
        entityName: 'Alert',
        actionPerformed: `TAZAMA: Created new alert ${alert.alert_id} with extracted tenantId: ${extractedTenantId}, txTp: ${extractedTxTp}`,
        outcome: 'SUCCESS',
      });

      return alert;
    } catch (error) {
      this.logger.error('Error creating alert', error);
      throw new InternalServerErrorException('Failed to create alert');
    }
  }

  async updateAlertData(
    alertId: string,
    dto: UpdateAlertDto,
    userId: string,
    tenantId: string,
  ) {
    const alert = await this.prisma.alert.findUnique({
      where: {
        alert_id: alertId,
        tenant_id: tenantId,
      },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    try {
      const updated = await this.prisma.alert.update({
        where: {
          alert_id: alertId,
          tenant_id: tenantId,
        },
        data: {
          confidence_per: dto.confidence_per,
          priority: dto.priority,
        },
      });

      await this.audit.logAction({
        userId,
        operation: 'ALERT_UPDATED',
        entityName: 'Alert',
        actionPerformed:
          `Updated alert ${alertId}` +
          (dto.confidence_per !== undefined
            ? `, confidence_per=${dto.confidence_per}`
            : '') +
          (dto.priority !== undefined ? `, priority=${dto.priority}` : ''),
        outcome: 'SUCCESS',
      });

      return updated;
    } catch (error) {
      this.logger.error(`Update failed for alert ${alertId}`, error);
      throw new InternalServerErrorException('Failed to update alert');
    }
  }

  async manualCloseAlert(
    alertId: string,
    status: AlertStatus,
    userId: string,
    tenantId: string,
  ) {
    const alert = await this.prisma.alert.findUnique({
      where: {
        alert_id: alertId,
        tenant_id: tenantId,
      },
    });

    if (!alert) {
      throw new NotFoundException(`Alert ${alertId} not found`);
    }

    try {
      const updated = await this.prisma.alert.update({
        where: {
          alert_id: alertId,
          tenant_id: tenantId,
        },
        data: { alert_status: status },
      });

      await this.audit.logAction({
        userId,
        operation: 'ALERT_AUTO_CLOSED',
        entityName: 'Alert',
        actionPerformed: `Auto-closed alert ${alertId} with status ${status}`,
        outcome: 'SUCCESS',
      });

      return updated;
    } catch (error) {
      this.logger.error(`Auto-close failed for alert ${alertId}`, error);
      throw new InternalServerErrorException('Failed to auto-close alert');
    }
  }
}
