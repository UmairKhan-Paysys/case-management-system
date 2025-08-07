import { Test, TestingModule } from '@nestjs/testing';
import { TriageService } from '../../src/triage/triage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../src/audit/auditLog.service';
import { SubmitAlertDto } from '../../src/triage/dto/submit-alert.dto';

import { AlertStatus, Priority, CaseType } from '@prisma/client';

import {
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UpdateAlertDto } from 'src/triage/dto/update-alert.dto';
// Suppress Logger.error output during tests
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

// Create a deep mock for PrismaService
const createMockPrismaService = () => ({
  alert: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    // Add any other methods used in TriageService here
  },
  case: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    // Add any other methods used in TriageService here
  },
  // Add other Prisma models if needed
});

describe('TriageService', () => {
  let service: TriageService;
  let prismaService: any;
  let auditService: any;

  beforeEach(async () => {
    const mockPrismaService = createMockPrismaService();
    const mockAuditService = {
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
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<TriageService>(TriageService);
    prismaService = module.get(PrismaService);
    auditService = module.get(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleNewAlert', () => {
    const mockSubmitAlertDto: SubmitAlertDto = {
      result: {
        message: 'Test alert message',
        report: { test: 'report data' },
        transaction: { test: 'transaction data' },
        networkMap: { test: 'network data' },
        source: 'test-source',
        txtp: 'test-txtp',
      },
    };

    const userId = 'test-user-id';
    const tenantId = 'test-tenant-id';

    it('should create new alert successfully', async () => {
      const expectedAlert = {
        alert_id: 'alert-123',
        tenant_id: tenantId,
        priority: Priority.LOW,
        source: 'test-source',
        txtp: '',
        alert_status: AlertStatus.NEW,
        message: 'Test alert message',
        alert_data: mockSubmitAlertDto.result.report,
        transaction: mockSubmitAlertDto.result.transaction,
        network_map: mockSubmitAlertDto.result.networkMap,
        confidence_per: 0,
        case_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      prismaService.alert.create.mockResolvedValue(expectedAlert);

      const result = await service.handleNewAlert(
        mockSubmitAlertDto,
        userId,
        tenantId,
      );

      expect(prismaService.alert.create).toHaveBeenCalled();
      expect(auditService.logAction).toHaveBeenCalled();
      expect(result).toEqual(expectedAlert);
    });
  });

  describe('updateAlertData', () => {
    const alertId = 'alert-123';
    const userId = 'test-user-id';
    const mockUpdateDto: UpdateAlertDto = {
      confidence_per: 85,
      priority: Priority.HIGH,
    };

    const mockExistingAlert = {
      alert_id: alertId,
      tenant_id: 'tenant-123',
      priority: Priority.LOW,
      source: 'test-source',
      txtp: null,
      message: 'Test alert message',
      alert_data: { test: 'report data' },
      transaction: { test: 'transaction data' },
      network_map: { test: 'network data' },
      confidence_per: 0,
      alert_status: AlertStatus.NEW,
      case_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should update alert successfully', async () => {
      const updatedAlert = {
        ...mockExistingAlert,
        confidence_per: 85,
        priority: Priority.HIGH,
      };

      prismaService.alert.findUnique.mockResolvedValue(mockExistingAlert);
      prismaService.alert.update.mockResolvedValue(updatedAlert);

      const result = await service.updateAlertData(
        alertId,
        mockUpdateDto,
        userId,
        'tenant-123',
      );

      expect(prismaService.alert.findUnique).toHaveBeenCalled();
      expect(prismaService.alert.update).toHaveBeenCalled();
      expect(auditService.logAction).toHaveBeenCalled();
      expect(result).toEqual(updatedAlert);
    });

    it('should throw NotFoundException when alert not found', async () => {
      prismaService.alert.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAlertData(alertId, mockUpdateDto, userId, 'tenant-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('manualCloseAlert', () => {
    const alertId = 'alert-123';
    const userId = 'test-user-id';
    const status = AlertStatus.AUTOCLOSED_CONFIRMED;

    const mockExistingAlert = {
      alert_id: alertId,
      tenant_id: 'tenant-123',
      priority: Priority.LOW,
      source: 'test-source',
      txtp: null,
      message: 'Test alert message',
      alert_data: { test: 'report data' },
      transaction: { test: 'transaction data' },
      network_map: { test: 'network data' },
      confidence_per: 0,
      alert_status: AlertStatus.NEW,
      case_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should close alert successfully', async () => {
      const closedAlert = {
        ...mockExistingAlert,
        alert_status: AlertStatus.AUTOCLOSED_CONFIRMED,
      };

      prismaService.alert.findUnique.mockResolvedValue(mockExistingAlert);
      prismaService.alert.update.mockResolvedValue(closedAlert);

      const result = await service.manualCloseAlert(
        alertId,
        status,
        userId,
        'tenant-123',
      );

      expect(prismaService.alert.findUnique).toHaveBeenCalled();
      expect(prismaService.alert.update).toHaveBeenCalled();
      expect(auditService.logAction).toHaveBeenCalled();
      expect(result).toEqual(closedAlert);
    });

    it('should throw NotFoundException when alert not found', async () => {
      prismaService.alert.findUnique.mockResolvedValue(null);

      await expect(
        service.manualCloseAlert(alertId, status, userId, 'tenant-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('alert creation with current implementation', () => {
    it('should create alert with hardcoded REST API source', async () => {
      const dto: SubmitAlertDto = {
        result: {
          message: 'Test alert',
          report: { test: 'data' },
          transaction: { test: 'transaction' },
          networkMap: { test: 'network' },
          source: 'any-source', // This will be ignored
          txtp: 'test-txtp',
        },
      };

      const mockAlert = {
        alert_id: 'alert-123',
        tenant_id: 'tenant-123',
        priority: Priority.LOW,
        source: 'REST API',
        txtp: '',
        alert_status: AlertStatus.NEW,
        message: 'Test alert',
      };

      prismaService.alert.create.mockResolvedValue(mockAlert);

      const result = await service.handleNewAlert(
        dto,
        'user-123',
        'tenant-123',
      );

      expect(prismaService.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: 'REST API',
        }),
      });
      expect(result).toEqual(mockAlert);
    });

    it('should extract txtp from transaction.TxTp when available', async () => {
      const dto: SubmitAlertDto = {
        result: {
          message: 'Test alert',
          report: { test: 'data' },
          transaction: { TxTp: 'transaction-txtp' },
          networkMap: { test: 'network' },
          source: 'test-source',
          txtp: 'ignored-txtp',
        },
      };

      const mockAlert = {
        alert_id: 'alert-123',
        tenant_id: 'tenant-123',
        priority: Priority.LOW,
        source: 'REST API',
        txtp: 'transaction-txtp',
        alert_status: AlertStatus.NEW,
        message: 'Test alert',
      };

      prismaService.alert.create.mockResolvedValue(mockAlert);

      const result = await service.handleNewAlert(
        dto,
        'user-123',
        'tenant-123',
      );

      expect(prismaService.alert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          txtp: 'transaction-txtp',
        }),
      });
      expect(result).toEqual(mockAlert);
    });
  });

  describe('error handling coverage', () => {
    it('should handle database errors in handleNewAlert', async () => {
      const dto: SubmitAlertDto = {
        result: {
          message: 'Test alert',
          report: { test: 'data' },
          transaction: { test: 'transaction' },
          networkMap: { test: 'network' },
          source: 'test-source',
          txtp: 'test-txtp',
        },
      };

      prismaService.alert.create.mockRejectedValue(new Error('Database error'));

      await expect(
        service.handleNewAlert(dto, 'user-123', 'tenant-123'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle database errors in manualCloseAlert', async () => {
      prismaService.alert.findUnique.mockResolvedValue(null);

      await expect(
        service.manualCloseAlert(
          'alert-123',
          AlertStatus.AUTOCLOSED_CONFIRMED,
          'user-123',
          'tenant-123',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Error Handling Coverage', () => {
    describe('updateAlertData error scenarios', () => {
      it('should throw NotFoundException when alert not found', async () => {
        prismaService.alert.findUnique.mockResolvedValue(null);

        await expect(
          service.updateAlertData(
            'non-existent-alert',
            {},
            'user-123',
            'tenant-123',
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw NotFoundException when alert belongs to different tenant', async () => {
        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'different-tenant',
          alert_status: AlertStatus.NEW,
        };

        prismaService.alert.findUnique.mockResolvedValue(mockAlert);

        await expect(
          service.updateAlertData('alert-123', {}, 'user-123', 'tenant-123'),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw InternalServerErrorException when database update fails', async () => {
        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'tenant-123',
          alert_status: AlertStatus.NEW,
        };

        prismaService.alert.findUnique.mockResolvedValue(mockAlert);
        prismaService.alert.update.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          service.updateAlertData(
            'alert-123',
            { confidence_per: 85 },
            'user-123',
            'tenant-123',
          ),
        ).rejects.toThrow(InternalServerErrorException);
      });
    });

    describe('manualCloseAlert error scenarios', () => {
      it('should throw NotFoundException when alert not found', async () => {
        prismaService.alert.findUnique.mockResolvedValue(null);

        await expect(
          service.manualCloseAlert(
            'non-existent-alert',
            AlertStatus.AUTOCLOSED_CONFIRMED,
            'user-123',
            'tenant-123',
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw NotFoundException when alert belongs to different tenant', async () => {
        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'different-tenant',
          alert_status: AlertStatus.NEW,
        };

        prismaService.alert.findUnique.mockResolvedValue(mockAlert);

        await expect(
          service.manualCloseAlert(
            'alert-123',
            AlertStatus.AUTOCLOSED_CONFIRMED,
            'user-123',
            'tenant-123',
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw InternalServerErrorException when database update fails', async () => {
        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'tenant-123',
          alert_status: AlertStatus.NEW,
        };

        prismaService.alert.findUnique.mockResolvedValue(mockAlert);
        prismaService.alert.update.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          service.manualCloseAlert(
            'alert-123',
            AlertStatus.AUTOCLOSED_CONFIRMED,
            'user-123',
            'tenant-123',
          ),
        ).rejects.toThrow(InternalServerErrorException);
      });
    });

    describe('investigateAlert error scenarios', () => {
      it('should throw NotFoundException when alert not found', async () => {
        prismaService.alert.findUnique.mockResolvedValue(null);

        await expect(
          service.investigateAlert(
            'non-existent-alert',
            CaseType.FRAUD,
            'user-123',
            'tenant-123',
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw NotFoundException when alert belongs to different tenant', async () => {
        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'different-tenant',
          priority: Priority.HIGH,
        };

        prismaService.alert.findUnique.mockResolvedValue(mockAlert);

        await expect(
          service.investigateAlert(
            'alert-123',
            CaseType.FRAUD,
            'user-123',
            'tenant-123',
          ),
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw InternalServerErrorException when case creation fails', async () => {
        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'tenant-123',
          priority: Priority.HIGH,
        };

        prismaService.alert.findUnique.mockResolvedValue(mockAlert);
        prismaService.case.create.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          service.investigateAlert(
            'alert-123',
            CaseType.FRAUD,
            'user-123',
            'tenant-123',
          ),
        ).rejects.toThrow(InternalServerErrorException);
      });

      it('should throw InternalServerErrorException when alert update fails after case creation', async () => {
        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'tenant-123',
          priority: Priority.HIGH,
        };

        const mockCase = {
          case_id: 'case-123',
          case_creator_user_id: 'user-123',
          tenant_id: 'tenant-123',
        };

        prismaService.alert.findUnique.mockResolvedValue(mockAlert);
        prismaService.case.create.mockResolvedValue(mockCase);
        prismaService.alert.update.mockRejectedValue(
          new Error('Database connection failed'),
        );

        await expect(
          service.investigateAlert(
            'alert-123',
            CaseType.FRAUD,
            'user-123',
            'tenant-123',
          ),
        ).rejects.toThrow(InternalServerErrorException);
      });
    });
  });
});
