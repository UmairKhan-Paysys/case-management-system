import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { TriageController } from '../../src/triage/triage.controller';
import { TriageService } from '../../src/triage/triage.service';
import { AuditLogService } from '../../src/audit/auditLog.service';
import { RolesGuard } from '../../src/auth/roles.guard';
import { SubmitAlertDto } from '../../src/triage/dto/submit-alert.dto';
import { UpdateAlertDto } from '../../src/triage/dto/update-alert.dto';
import { AutoCloseAlertDto } from '../../src/triage/dto/auto-close-alert.dto';
import { AlertStatus, Priority, CaseType } from '@prisma/client';

describe('TriageController', () => {
  let controller: TriageController;
  let triageService: jest.Mocked<TriageService>;

  const mockTriageService = {
    handleNewAlert: jest.fn(),
    updateAlertData: jest.fn(),
    manualCloseAlert: jest.fn(),
    investigateAlert: jest.fn(),
  };

  const mockAuditLogService = {
    log: jest.fn(),
    create: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
    getAllAndOverride: jest.fn(),
    getAllAndMerge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TriageController],
      providers: [
        {
          provide: TriageService,
          useValue: mockTriageService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        RolesGuard,
      ],
    }).compile();

    controller = module.get<TriageController>(TriageController);
    triageService = module.get(TriageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('submitAlert', () => {
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

    const mockRequest = {
      user: {
        user_id: 'test-user-id',
        tenantId: 'test-tenant-id',
        role: 'test-role',
        permissions: ['test-permission'],
      },
    };

    it('should submit alert successfully', async () => {
      const expectedResult = {
        alert_id: 'alert-123',
        tenant_id: 'test-tenant-id',
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

      const mockInvestigateResult = {
        alert_id: 'alert-123',
        tenant_id: 'test-tenant-id',
        priority: Priority.LOW,
        source: 'test-source',
        txtp: null,
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        confidence_per: 0,
        alert_status: AlertStatus.SENT_FOR_INVESTIGATION,
        case_id: 'case-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      triageService.handleNewAlert.mockResolvedValue(expectedResult);
      triageService.investigateAlert.mockResolvedValue(mockInvestigateResult);

      const result = await controller.submitAlert(
        mockSubmitAlertDto,
        mockRequest,
      );

      expect(triageService.handleNewAlert).toHaveBeenCalledWith(
        mockSubmitAlertDto,
        'test-user-id',
        'test-tenant-id',
      );
      expect(triageService.handleNewAlert).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors during alert submission', async () => {
      const error = new Error('Service error');
      triageService.handleNewAlert.mockRejectedValue(error);

      await expect(
        controller.submitAlert(mockSubmitAlertDto, mockRequest),
      ).rejects.toThrow('Service error');

      expect(triageService.handleNewAlert).toHaveBeenCalledWith(
        mockSubmitAlertDto,
        'test-user-id',
        'test-tenant-id',
      );
    });

    it('should extract user data correctly from request', async () => {
      const expectedResult = {
        alert_id: 'alert-456',
        tenant_id: 'test-tenant-id',
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
      triageService.handleNewAlert.mockResolvedValue(expectedResult);

      await controller.submitAlert(mockSubmitAlertDto, mockRequest);

      expect(triageService.handleNewAlert).toHaveBeenCalledWith(
        mockSubmitAlertDto,
        'test-user-id',
        'test-tenant-id',
      );
    });

    // Add CONFIDENCE_THRESHOLD tests for submitAlert method
    describe('CONFIDENCE_THRESHOLD logic in submitAlert', () => {
      const originalEnv = process.env.CONFIDENCE_THRESHOLD;

      afterEach(() => {
        process.env.CONFIDENCE_THRESHOLD = originalEnv;
      });

      it('should create case when CONFIDENCE_THRESHOLD is invalid', async () => {
        delete process.env.CONFIDENCE_THRESHOLD;

        const expectedAlert = {
          alert_id: 'alert-456',
          tenant_id: 'test-tenant-id',
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

        const mockCase = {
          alert_id: 'alert-456',
          tenant_id: 'test-tenant-id',
          priority: Priority.LOW,
          source: 'test-source',
          txtp: null,
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 0,
          alert_status: AlertStatus.SENT_FOR_INVESTIGATION,
          case_id: 'case-123',
          created_at: new Date(),
          updated_at: new Date(),
        };

        triageService.handleNewAlert.mockResolvedValue(expectedAlert);
        triageService.investigateAlert.mockResolvedValue(mockCase);

        await controller.submitAlert(mockSubmitAlertDto, mockRequest);

        expect(triageService.handleNewAlert).toHaveBeenCalledWith(
          mockSubmitAlertDto,
          'test-user-id',
          'test-tenant-id',
        );
        expect(triageService.investigateAlert).toHaveBeenCalledWith(
          'alert-456',
          CaseType.FRAUD,
          'test-user-id',
          'test-tenant-id',
        );
      });

      it('should not create case when CONFIDENCE_THRESHOLD is valid', async () => {
        process.env.CONFIDENCE_THRESHOLD = '75';

        const expectedAlert = {
          alert_id: 'alert-456',
          tenant_id: 'test-tenant-id',
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

        triageService.handleNewAlert.mockResolvedValue(expectedAlert);

        await controller.submitAlert(mockSubmitAlertDto, mockRequest);

        expect(triageService.handleNewAlert).toHaveBeenCalledWith(
          mockSubmitAlertDto,
          'test-user-id',
          'test-tenant-id',
        );
        // Should NOT call investigateAlert when CONFIDENCE_THRESHOLD is valid
        expect(triageService.investigateAlert).not.toHaveBeenCalled();
      });
    });
  });

  describe('getTest', () => {
    it('should return test status', () => {
      const result = controller.getTest();
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('updateAlert', () => {
    const mockUpdateAlertDto: UpdateAlertDto = {
      confidence_per: 85,
      priority: Priority.HIGH,
    };

    const mockRequest = {
      user: {
        user_id: 'test-user-id',
        tenantId: 'test-tenant-id',
      },
    };

    it('should update alert successfully', async () => {
      const expectedResult = {
        alert_id: 'alert-123',
        tenant_id: 'test-tenant-id',
        priority: Priority.HIGH,
        source: 'test-source',
        txtp: null,
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        confidence_per: 85,
        alert_status: AlertStatus.NEW,
        case_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      triageService.updateAlertData.mockResolvedValue(expectedResult);

      const result = await controller.updateAlert(
        'alert-123',
        mockUpdateAlertDto,
        mockRequest,
      );

      expect(triageService.updateAlertData).toHaveBeenCalledWith(
        'alert-123',
        mockUpdateAlertDto,
        'test-user-id',
        'test-tenant-id',
      );
      expect(triageService.updateAlertData).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors during alert update', async () => {
      const error = new Error('Update failed');
      triageService.updateAlertData.mockRejectedValue(error);

      await expect(
        controller.updateAlert('alert-123', mockUpdateAlertDto, mockRequest),
      ).rejects.toThrow('Update failed');

      expect(triageService.updateAlertData).toHaveBeenCalledWith(
        'alert-123',
        mockUpdateAlertDto,
        'test-user-id',
        'test-tenant-id',
      );
    });
  });

  describe('autoCloseAlert', () => {
    const mockAutoCloseDto: AutoCloseAlertDto = {
      status: AlertStatus.AUTOCLOSED_CONFIRMED,
    };

    const mockRequest = {
      user: {
        user_id: 'test-user-id',
        tenantId: 'test-tenant-id',
      },
    };

    it('should auto-close alert successfully', async () => {
      const expectedResult = {
        alert_id: 'alert-123',
        tenant_id: 'test-tenant-id',
        priority: Priority.LOW,
        source: 'test-source',
        txtp: null,
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        confidence_per: 85,
        alert_status: AlertStatus.AUTOCLOSED_CONFIRMED,
        case_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      triageService.manualCloseAlert.mockResolvedValue(expectedResult);

      const result = await controller.autoCloseAlert(
        'alert-123',
        mockAutoCloseDto,
        mockRequest,
      );

      expect(triageService.manualCloseAlert).toHaveBeenCalledWith(
        'alert-123',
        AlertStatus.AUTOCLOSED_CONFIRMED,
        'test-user-id',
        'test-tenant-id',
      );
      expect(triageService.manualCloseAlert).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors during alert closure', async () => {
      const error = new Error('Close failed');
      triageService.manualCloseAlert.mockRejectedValue(error);

      await expect(
        controller.autoCloseAlert('alert-123', mockAutoCloseDto, mockRequest),
      ).rejects.toThrow('Close failed');

      expect(triageService.manualCloseAlert).toHaveBeenCalledWith(
        'alert-123',
        AlertStatus.AUTOCLOSED_CONFIRMED,
        'test-user-id',
        'test-tenant-id',
      );
    });

    it('should handle different alert statuses', async () => {
      const refutedDto: AutoCloseAlertDto = {
        status: AlertStatus.AUTOCLOSED_REFUTED,
      };
      const expectedResult = {
        alert_id: 'alert-123',
        tenant_id: 'test-tenant-id',
        priority: Priority.LOW,
        source: 'test-source',
        txtp: null,
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        confidence_per: 85,
        alert_status: AlertStatus.AUTOCLOSED_REFUTED,
        case_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      triageService.manualCloseAlert.mockResolvedValue(expectedResult);

      const result = await controller.autoCloseAlert(
        'alert-123',
        refutedDto,
        mockRequest,
      );

      expect(triageService.manualCloseAlert).toHaveBeenCalledWith(
        'alert-123',
        AlertStatus.AUTOCLOSED_REFUTED,
        'test-user-id',
        'test-tenant-id',
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('ingestAlert', () => {
    it('should ingest alert successfully', async () => {
      const alertDto = {
        tenant_id: 'test-tenant-id',
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        source: 'test-source',
        txtp: 'test-txtp',
        confidence_per: 85,
      };

      const req = {
        user: {
          tenantId: 'test-tenant-id',
        },
      };

      const expectedAlert = {
        alert_id: 'alert-123',
        tenant_id: 'test-tenant-id',
        priority: Priority.LOW,
        source: 'test-source',
        txtp: 'test-txtp',
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        confidence_per: 85,
        alert_status: AlertStatus.NEW,
        case_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      triageService.handleNewAlert.mockResolvedValue(expectedAlert);

      const result = await controller.ingestAlert(alertDto, req);

      expect(result).toEqual({ status: 'success' });
      expect(triageService.handleNewAlert).toHaveBeenCalledWith(
        {
          result: {
            message: alertDto.message,
            report: alertDto.alert_data,
            transaction: alertDto.transaction,
            networkMap: alertDto.network_map,
            source: alertDto.source,
            txtp: alertDto.txtp,
          },
        },
        'http',
        'test-tenant-id',
      );
    });

    it('should handle error during alert ingestion', async () => {
      const alertDto = {
        tenant_id: 'test-tenant-id',
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        source: 'test-source',
        txtp: 'test-txtp',
        confidence_per: 85,
      };

      const req = {
        user: {
          tenantId: 'test-tenant-id',
        },
      };

      triageService.handleNewAlert.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await controller.ingestAlert(alertDto, req);

      expect(result).toEqual({
        status: 'error',
        message: 'Failed to persist alert',
      });
    });

    it('should use default tenant when user tenantId is not available', async () => {
      const alertDto = {
        tenant_id: 'test-tenant-id',
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        source: 'test-source',
        txtp: 'test-txtp',
        confidence_per: 85,
      };

      const req = {}; // No user object

      const expectedAlert = {
        alert_id: 'alert-123',
        tenant_id: 'default',
        priority: Priority.LOW,
        source: 'test-source',
        txtp: 'test-txtp',
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        confidence_per: 85,
        alert_status: AlertStatus.NEW,
        case_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      triageService.handleNewAlert.mockResolvedValue(expectedAlert);

      const result = await controller.ingestAlert(alertDto, req);

      expect(result).toEqual({ status: 'success' });
      expect(triageService.handleNewAlert).toHaveBeenCalledWith(
        expect.any(Object),
        'http',
        'default', // Should use default tenant
      );
    });

    it('should handle alert with missing optional fields (source and txtp)', async () => {
      const alertDto = {
        tenant_id: 'test-tenant-id',
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        confidence_per: 85,
        // source and txtp are missing
      };

      const req = {
        user: {
          tenantId: 'test-tenant-id',
        },
      };

      const expectedAlert = {
        alert_id: 'alert-123',
        tenant_id: 'test-tenant-id',
        priority: Priority.LOW,
        source: '',
        txtp: '',
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        confidence_per: 85,
        alert_status: AlertStatus.NEW,
        case_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      triageService.handleNewAlert.mockResolvedValue(expectedAlert);

      const result = await controller.ingestAlert(alertDto, req);

      expect(result).toEqual({ status: 'success' });
      expect(triageService.handleNewAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({
            source: '', // Should default to empty string
            txtp: '', // Should default to empty string
          }),
        }),
        'http',
        'test-tenant-id',
      );
    });

    it('should handle alert with null optional fields', async () => {
      const alertDto = {
        tenant_id: 'test-tenant-id',
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        confidence_per: 85,
        source: undefined,
        txtp: undefined,
      };

      const req = {
        user: {
          tenantId: 'test-tenant-id',
        },
      };

      const expectedAlert = {
        alert_id: 'alert-123',
        tenant_id: 'test-tenant-id',
        priority: Priority.LOW,
        source: '',
        txtp: '',
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        confidence_per: 85,
        alert_status: AlertStatus.NEW,
        case_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      triageService.handleNewAlert.mockResolvedValue(expectedAlert);

      const result = await controller.ingestAlert(alertDto, req);

      expect(result).toEqual({ status: 'success' });
      expect(triageService.handleNewAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          result: expect.objectContaining({
            source: '', // Should default to empty string
            txtp: '', // Should default to empty string
          }),
        }),
        'http',
        'test-tenant-id',
      );
    });

    describe('CONFIDENCE_THRESHOLD environment variable tests', () => {
      const originalEnv = process.env.CONFIDENCE_THRESHOLD;

      afterEach(() => {
        process.env.CONFIDENCE_THRESHOLD = originalEnv;
      });

      it('should handle undefined CONFIDENCE_THRESHOLD', async () => {
        delete process.env.CONFIDENCE_THRESHOLD;

        const alertDto = {
          tenant_id: 'test-tenant-id',
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
        };

        const req = { user: { tenantId: 'test-tenant-id' } };

        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'test-tenant-id',
          priority: Priority.LOW,
          source: null,
          txtp: null,
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
          alert_status: AlertStatus.NEW,
          case_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        triageService.handleNewAlert.mockResolvedValue(mockAlert);

        const result = await controller.ingestAlert(alertDto, req);

        expect(result).toEqual({ status: 'success' });
      });

      it('should handle null CONFIDENCE_THRESHOLD', async () => {
        process.env.CONFIDENCE_THRESHOLD = null as any;

        const alertDto = {
          tenant_id: 'test-tenant-id',
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
        };

        const req = { user: { tenantId: 'test-tenant-id' } };

        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'test-tenant-id',
          priority: Priority.LOW,
          source: null,
          txtp: null,
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
          alert_status: AlertStatus.NEW,
          case_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        triageService.handleNewAlert.mockResolvedValue(mockAlert);

        const result = await controller.ingestAlert(alertDto, req);

        expect(result).toEqual({ status: 'success' });
      });

      it('should handle empty string CONFIDENCE_THRESHOLD', async () => {
        process.env.CONFIDENCE_THRESHOLD = '';

        const alertDto = {
          tenant_id: 'test-tenant-id',
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
        };

        const req = { user: { tenantId: 'test-tenant-id' } };

        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'test-tenant-id',
          priority: Priority.LOW,
          source: null,
          txtp: null,
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
          alert_status: AlertStatus.NEW,
          case_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        triageService.handleNewAlert.mockResolvedValue(mockAlert);

        const result = await controller.ingestAlert(alertDto, req);

        expect(result).toEqual({ status: 'success' });
      });

      it('should handle whitespace-only CONFIDENCE_THRESHOLD', async () => {
        process.env.CONFIDENCE_THRESHOLD = '   ';

        const alertDto = {
          tenant_id: 'test-tenant-id',
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
        };

        const req = { user: { tenantId: 'test-tenant-id' } };

        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'test-tenant-id',
          priority: Priority.LOW,
          source: null,
          txtp: null,
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
          alert_status: AlertStatus.NEW,
          case_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        triageService.handleNewAlert.mockResolvedValue(mockAlert);

        const result = await controller.ingestAlert(alertDto, req);

        expect(result).toEqual({ status: 'success' });
      });

      it('should handle non-numeric CONFIDENCE_THRESHOLD', async () => {
        process.env.CONFIDENCE_THRESHOLD = 'not-a-number';

        const alertDto = {
          tenant_id: 'test-tenant-id',
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
        };

        const req = { user: { tenantId: 'test-tenant-id' } };

        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'test-tenant-id',
          priority: Priority.LOW,
          source: null,
          txtp: null,
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
          alert_status: AlertStatus.NEW,
          case_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        triageService.handleNewAlert.mockResolvedValue(mockAlert);

        const result = await controller.ingestAlert(alertDto, req);

        expect(result).toEqual({ status: 'success' });
      });

      it('should handle valid numeric CONFIDENCE_THRESHOLD', async () => {
        process.env.CONFIDENCE_THRESHOLD = '80';

        const alertDto = {
          tenant_id: 'test-tenant-id',
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
        };

        const req = { user: { tenantId: 'test-tenant-id' } };

        const mockAlert = {
          alert_id: 'alert-123',
          tenant_id: 'test-tenant-id',
          priority: Priority.LOW,
          source: null,
          txtp: null,
          message: 'Test alert message',
          alert_data: { test: 'report data' },
          transaction: { test: 'transaction data' },
          network_map: { test: 'network data' },
          confidence_per: 85,
          alert_status: AlertStatus.NEW,
          case_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        triageService.handleNewAlert.mockResolvedValue(mockAlert);

        const result = await controller.ingestAlert(alertDto, req);

        expect(result).toEqual({ status: 'success' });
        // Verify that investigateAlert was NOT called since CONFIDENCE_THRESHOLD is valid
        expect(triageService.investigateAlert).not.toHaveBeenCalled();
      });
    });
  });

  describe('getTest', () => {
    it('should return ok status', () => {
      const result = controller.getTest();
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('sendForInvestigation', () => {
    it('should send alert for investigation', async () => {
      const alertId = 'alert-123';
      const dto = { caseType: CaseType.FRAUD };
      const req = {
        user: {
          user_id: 'user-123',
          tenantId: 'tenant-456',
        },
      };

      const expectedResult = {
        alert_id: 'alert-123',
        tenant_id: 'tenant-456',
        priority: Priority.HIGH,
        source: 'test-source',
        txtp: 'test-txtp',
        message: 'Test alert message',
        alert_data: { test: 'report data' },
        transaction: { test: 'transaction data' },
        network_map: { test: 'network data' },
        confidence_per: 85,
        alert_status: AlertStatus.SENT_FOR_INVESTIGATION,
        case_id: 'case-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      triageService.investigateAlert.mockResolvedValue(expectedResult);

      const result = await controller.sendForInvestigation(alertId, dto, req);

      expect(result).toEqual(expectedResult);
      expect(triageService.investigateAlert).toHaveBeenCalledWith(
        alertId,
        dto.caseType,
        'user-123',
        'tenant-456',
      );
    });
  });
});
