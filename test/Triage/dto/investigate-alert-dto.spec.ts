import 'reflect-metadata';
import { InvestigateAlertDto } from '../../../src/triage/dto/investigate-alert-dto';
import { CaseType } from '@prisma/client';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

describe('InvestigateAlertDto', () => {
  it('should be defined', () => {
    expect(InvestigateAlertDto).toBeDefined();
  });

  it('should create an instance', () => {
    const dto = new InvestigateAlertDto();
    expect(dto).toBeDefined();
    expect(dto).toBeInstanceOf(InvestigateAlertDto);
  });

  it('should validate valid caseType', async () => {
    const dto = plainToClass(InvestigateAlertDto, {
      caseType: CaseType.FRAUD,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.caseType).toBe(CaseType.FRAUD);
  });

  it('should validate all CaseType enum values', async () => {
    const caseTypes = Object.values(CaseType);

    for (const caseType of caseTypes) {
      const dto = plainToClass(InvestigateAlertDto, {
        caseType: caseType,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.caseType).toBe(caseType);
    }
  });

  it('should fail validation for invalid caseType', async () => {
    const dto = plainToClass(InvestigateAlertDto, {
      caseType: 'INVALID_CASE_TYPE',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('caseType');
  });

  it('should transform string to proper type', () => {
    const dto = plainToClass(InvestigateAlertDto, {
      caseType: 'FRAUD',
    });

    expect(dto.caseType).toBe('FRAUD');
  });
});
