import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TriageService } from '../src/triage/triage.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../src/audit/auditLog.service';
import { SubmitAlertDto } from '../src/triage/dto/submit-alert.dto';

describe('TAZAMA Implementation Tests', () => {
  let service: TriageService;
  let prismaService: jest.Mocked<PrismaService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const mockPrismaService = {
      alert: {
        create: jest.fn().mockResolvedValue({
          alert_id: 'alert-123',
          tenant_id: 'tenant-123',
          txtp: 'PAYMENT',
        }),
      },
    };

    const mockAuditLogService = {
      logAction: jest.fn().mockResolvedValue({
        audit_log_id: 'audit-123',
        user_id: 'user-123',
        operation: 'TEST',
        entity_name: 'Test',
        action_performed: 'Test action',
        outcome: 'SUCCESS',
        performed_at: new Date(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriageService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<TriageService>(TriageService);
    prismaService = module.get(PrismaService);
    auditLogService = module.get(AuditLogService);
  });

  describe('TAZAMA Requirements', () => {
    it('should successfully extract tenantId and txTp from valid transaction object', async () => {
      // Arrange: Valid transaction object with tenantId and txTp
      const validDto: SubmitAlertDto = {
        result: {
          message: 'Test alert',
          source: 'test-source',
          report: {},
          transaction: {
            tenantId: 'tenant-123',
            txTp: 'PAYMENT',
          },
          networkMap: {},
        },
      };

      const mockAlert = {
        alert_id: 'alert-123',
        tenant_id: 'tenant-123',
        txtp: 'PAYMENT',
      };

      // Mock is already set up in beforeEach
      auditLogService.logAction.mockResolvedValue({
        audit_log_id: 'audit-123',
        user_id: 'user-123',
        operation: 'ALERT_CREATED',
        entity_name: 'Alert',
        action_performed: 'Test action',
        outcome: 'SUCCESS',
        performed_at: new Date(),
      });

      // Act
      const result = await service.handleNewAlert(validDto, 'user-123', 'tenant-123');

      // Assert
      expect(result).toEqual(mockAlert);
      expect(prismaService.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant_id: 'tenant-123', // Extracted tenantId
          txtp: 'PAYMENT', // Extracted txTp
        }),
      });
      expect(auditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'ALERT_CREATED',
          actionPerformed: expect.stringContaining('TAZAMA: Created new alert'),
        }),
      );
    });

    it('should reject alert when transaction object is empty', async () => {
      // Arrange: Empty transaction object
      const invalidDto: SubmitAlertDto = {
        result: {
          message: 'Test alert',
          source: 'test-source',
          report: {},
          transaction: {}, // Empty transaction object
          networkMap: {},
        },
      };

      auditLogService.logAction.mockResolvedValue({
        audit_log_id: 'audit-123',
        user_id: 'user-123',
        operation: 'ALERT_VALIDATION_FAILED',
        entity_name: 'Alert',
        action_performed: 'Test action',
        outcome: 'FAILED',
        performed_at: new Date(),
      });

      // Act & Assert
      await expect(
        service.handleNewAlert(invalidDto, 'user-123', 'tenant-123'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.handleNewAlert(invalidDto, 'user-123', 'tenant-123'),
      ).rejects.toThrow('Missing or malformed tenantId in transaction object');

      expect(auditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'ALERT_VALIDATION_FAILED',
          actionPerformed: 'Alert submission rejected due to missing or malformed tenantId in transaction object',
        }),
      );
    });

    it('should reject alert when tenantId is missing in transaction object', async () => {
      // Arrange: Missing tenantId in transaction
      const invalidDto: SubmitAlertDto = {
        result: {
          message: 'Test alert',
          source: 'test-source',
          report: {},
          transaction: {
            txTp: 'PAYMENT', // Missing tenantId
          },
          networkMap: {},
        },
      };

      auditLogService.logAction.mockResolvedValue({
        audit_log_id: 'audit-123',
        user_id: 'user-123',
        operation: 'ALERT_VALIDATION_FAILED',
        entity_name: 'Alert',
        action_performed: 'Test action',
        outcome: 'FAILED',
        performed_at: new Date(),
      });

      // Act & Assert
      await expect(
        service.handleNewAlert(invalidDto, 'user-123', 'tenant-123'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.handleNewAlert(invalidDto, 'user-123', 'tenant-123'),
      ).rejects.toThrow('Missing or malformed tenantId in transaction object');

      expect(auditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'ALERT_VALIDATION_FAILED',
          actionPerformed: 'Alert submission rejected due to missing or malformed tenantId in transaction object',
        }),
      );
    });

    it('should reject alert when txTp is missing in transaction object', async () => {
      // Arrange: Missing txTp in transaction
      const invalidDto: SubmitAlertDto = {
        result: {
          message: 'Test alert',
          source: 'test-source',
          report: {},
          transaction: {
            tenantId: 'tenant-123', // Missing txTp
          },
          networkMap: {},
        },
      };

      auditLogService.logAction.mockResolvedValue({
        audit_log_id: 'audit-123',
        user_id: 'user-123',
        operation: 'ALERT_VALIDATION_FAILED',
        entity_name: 'Alert',
        action_performed: 'Test action',
        outcome: 'FAILED',
        performed_at: new Date(),
      });

      // Act & Assert
      await expect(
        service.handleNewAlert(invalidDto, 'user-123', 'tenant-123'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.handleNewAlert(invalidDto, 'user-123', 'tenant-123'),
      ).rejects.toThrow('Missing or malformed txTp in transaction object');

      expect(auditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'ALERT_VALIDATION_FAILED',
          actionPerformed: 'Alert submission rejected due to missing or malformed txTp in transaction object',
        }),
      );
    });

    it('should reject alert when tenant ID mismatch between transaction and JWT', async () => {
      // Arrange: Tenant ID mismatch
      const invalidDto: SubmitAlertDto = {
        result: {
          message: 'Test alert',
          source: 'test-source',
          report: {},
          transaction: {
            tenantId: 'different-tenant', // Different from JWT tenant
            txTp: 'PAYMENT',
          },
          networkMap: {},
        },
      };

      auditLogService.logAction.mockResolvedValue({
        audit_log_id: 'audit-123',
        user_id: 'user-123',
        operation: 'ALERT_VALIDATION_FAILED',
        entity_name: 'Alert',
        action_performed: 'Test action',
        outcome: 'FAILED',
        performed_at: new Date(),
      });

      // Act & Assert
      await expect(
        service.handleNewAlert(invalidDto, 'user-123', 'tenant-123'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.handleNewAlert(invalidDto, 'user-123', 'tenant-123'),
      ).rejects.toThrow('Tenant ID mismatch between transaction and JWT token');

      expect(auditLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'ALERT_VALIDATION_FAILED',
          actionPerformed: expect.stringContaining('Alert submission rejected due to tenant ID mismatch'),
        }),
      );
    });
  });
}); 