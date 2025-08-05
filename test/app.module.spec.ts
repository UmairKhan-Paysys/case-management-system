import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';

describe('AppModule', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'error').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(jest.fn());
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(jest.fn());
  });
  let module: TestingModule;

  beforeEach(async () => {
    const mockJwtStrategy = {
      validate: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .overrideProvider(JwtStrategy)
      .useValue(mockJwtStrategy)
      .compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have PrismaService as provider', () => {
    const prismaService = module.get(PrismaService);
    expect(prismaService).toBeDefined();
  });
});
