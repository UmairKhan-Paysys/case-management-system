import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  StartupFactory,
  IStartupService,
} from '@tazama-lf/frms-coe-startup-lib';
import { TriageService } from '../triage/triage.service';

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

  async handleMessage(req: unknown) {
    try {
      // Optionally: validate req structure here
      // You may want to use a DTO and class-validator for strict validation
      await this.triageService.handleNewAlert(
        req as any,
        'nats',
        (req as any).tenantId || 'default',
      );
      this.logger.log('Alert ingested from NATS');
    } catch (err) {
      this.logger.error('Invalid alert message', err);
      // Do not throw, just log and skip
    }
  }
}
