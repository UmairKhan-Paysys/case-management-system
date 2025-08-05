import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogModule } from '../../src/audit/auditLog.module';
import { AuditLogService } from '../../src/audit/auditLog.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuditLogModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    const mockPrismaService = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };

    module = await Test.createTestingModule({
      imports: [AuditLogModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide AuditLogService', () => {
    const auditLogService = module.get<AuditLogService>(AuditLogService);
    expect(auditLogService).toBeDefined();
    expect(auditLogService).toBeInstanceOf(AuditLogService);
  });

  it('should export AuditLogService', () => {
    const auditLogService = module.get<AuditLogService>(AuditLogService);
    expect(auditLogService).toBeDefined();
  });

  it('should import PrismaModule', () => {
    const moduleMetadata = Reflect.getMetadata('imports', AuditLogModule);
    expect(moduleMetadata).toContain(PrismaModule);
  });

  it('should have correct module configuration', () => {
    const moduleMetadata = Reflect.getMetadata('providers', AuditLogModule);
    const exportsMetadata = Reflect.getMetadata('exports', AuditLogModule);

    expect(moduleMetadata).toContain(AuditLogService);
    expect(exportsMetadata).toContain(AuditLogService);
  });
});
