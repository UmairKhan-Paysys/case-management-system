import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { TriageService } from './triage.service';
import { SubmitAlertDto } from './dto/submit-alert.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';
import { AutoCloseAlertDto } from './dto/auto-close-alert.dto';
import { InvestigateAlertDto } from './dto/investigate-alert-dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CaseType } from '@prisma/client';
import { AlertMessageDto } from '../nats/Dto/AlertMessageDto.dto';

@Controller('api/v1/triage/alerts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TriageController {
  private readonly logger = new Logger(TriageController.name);

  constructor(private readonly triageService: TriageService) {}

  @Post('')
  @Roles('CMS-TEST-ROLE', 'manage-account')
  async submitAlert(@Body() dto: SubmitAlertDto, @Req() req) {
    const userId = req.user.user_id;
    const tenantId = req.user.tenantId;

    const alert = await this.triageService.handleNewAlert(
      dto,
      userId,
      tenantId,
    );

    const confidenceThreshold = process.env.CONFIDENCE_THRESHOLD;

    if (
      confidenceThreshold === undefined ||
      confidenceThreshold === null ||
      confidenceThreshold.trim() === '' ||
      isNaN(Number(confidenceThreshold))
    ) {
      this.logger.log('CASE_WILL_BE_CREATED');
      const caseType = CaseType.FRAUD;
      const caseCreated = await this.triageService.investigateAlert(
        alert.alert_id,
        caseType,
        userId,
        tenantId,
      );
      alert.case_id = caseCreated.case_id;
    }

    return alert;
  }

  @Post('ingest')
  @Roles('CMS-TEST-ROLE', 'manage-account')
  async ingestAlert(@Body() alertDto: AlertMessageDto, @Req() req) {
    const tenantId = req?.user?.tenantId ?? 'default';

    try {
      const submitAlertDto: SubmitAlertDto = {
        result: {
          message: alertDto.message,
          report: alertDto.alert_data,
          transaction: alertDto.transaction,
          networkMap: alertDto.network_map,
          source: alertDto.source ?? '',
          txtp: alertDto.txtp ?? '',
        },
      };

      await this.triageService.handleNewAlert(submitAlertDto, 'http', tenantId);
      this.logger.log(`Alert ingested from HTTP for tenant: ${tenantId}`);
      return { status: 'success' };
    } catch (err) {
      this.logger.error(`Failed to persist alert for tenant: ${tenantId}`, {
        error: err instanceof Error ? err.message : String(err),
        tenantId,
        alertData: alertDto,
      });
      return { status: 'error', message: 'Failed to persist alert' };
    }
  }

  @Get('test')
  getTest() {
    return { status: 'ok' };
  }

  @Patch(':alertId')
  @Roles('CMS-TEST-ROLE', 'manage-account')
  async updateAlert(
    @Param('alertId') alertId: string,
    @Body() dto: UpdateAlertDto,
    @Req() req,
  ) {
    const userId = req.user.user_id;
    const tenantId = req.user.tenantId;
    return this.triageService.updateAlertData(alertId, dto, userId, tenantId);
  }

  @Patch(':alertId/auto-close')
  @Roles('CMS-TEST-ROLE', 'manage-account')
  async autoCloseAlert(
    @Param('alertId') alertId: string,
    @Body() dto: AutoCloseAlertDto,
    @Req() req,
  ) {
    const userId = req.user.user_id;
    const tenantId = req.user.tenantId;
    return this.triageService.manualCloseAlert(
      alertId,
      dto.status,
      userId,
      tenantId,
    );
  }

  @Patch(':alertId/investigate')
  @Roles('CMS-TEST-ROLE', 'manage-account')
  async sendForInvestigation(
    @Param('alertId') alertId: string,
    @Body() dto: InvestigateAlertDto,
    @Req() req,
  ) {
    const userId = req.user.user_id;
    const tenantId = req.user.tenantId;
    return this.triageService.investigateAlert(
      alertId,
      dto.caseType,
      userId,
      tenantId,
    );
  }
}
