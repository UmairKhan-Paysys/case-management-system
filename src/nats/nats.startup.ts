import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  StartupFactory,
  IStartupService,
} from '@tazama-lf/frms-coe-startup-lib';
import { TriageService } from '../triage/triage.service';
import { AlertMessageDto } from './Dto/AlertMessageDto.dto';
import { SubmitAlertDto } from '../triage/dto/submit-alert.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class NatsStartupService implements OnModuleInit {
  private readonly logger = new Logger(NatsStartupService.name);
  private server: IStartupService;

  constructor(private readonly triageService: TriageService) {}

  async onModuleInit() {
    this.server = new StartupFactory();
    await this.server.init(this.handleMessage.bind(this), this.logger);
    this.logger.log('NATS Startup Service initialized');
  }

  async handleMessage(req: Record<string, any>) {
    const alertDto = plainToInstance(AlertMessageDto, req);
    const errors = await validate(alertDto);

    if (errors.length > 0) {
      this.logger.error('Invalid alert message received', {
        validationErrors: errors.map((e) => ({
          property: e.property,
          constraints: e.constraints,
        })),
        originalPayload: req,
      });
      return;
    }

    const tenantId = req?.tenantId ?? 'default';

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

      await this.triageService.handleNewAlert(submitAlertDto, 'nats', tenantId);
      this.logger.log(`Alert ingested from NATS for tenant: ${tenantId}`);
    } catch (err) {
      this.logger.error(' Failed to persist alert', {
        error: err instanceof Error ? err.message : err,
        tenantId,
        alertData: alertDto,
      });
    }
  }
}
