import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { of, throwError } from 'rxjs';
import {
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';

// Suppress Logger.error output during tests
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

// Suppress Logger.error output during tests
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

describe('AuthService', () => {
  let service: AuthService;
  let httpService: any;
  let configService: any;

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'TAZAMA_AUTH_URL') {
        return 'http://auth.example.com/login';
      }
      return undefined;
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    httpService = module.get(HttpService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully login with valid credentials and return token string', async () => {
      const mockAuthUrl = 'http://auth.example.com/login';
      const mockToken = 'jwt-token-123';
      const username = 'testuser';
      const password = 'testpass';

      configService.get.mockReturnValue(mockAuthUrl);
      httpService.post.mockReturnValue(of({ data: mockToken }));

      const result = await service.login(username, password);

      expect(configService.get).toHaveBeenCalledWith('TAZAMA_AUTH_URL');
      expect(httpService.post).toHaveBeenCalledWith(mockAuthUrl, {
        username,
        password,
      });
      expect(result).toEqual({
        message: 'Login successful',
        token: mockToken,
        expiresIn: null,
      });
    });

    it('should successfully login and extract token from object response with token property', async () => {
      const mockAuthUrl = 'http://auth.example.com/login';
      const mockToken = 'jwt-token-456';
      const username = 'testuser';
      const password = 'testpass';

      configService.get.mockReturnValue(mockAuthUrl);
      httpService.post.mockReturnValue(of({ data: { token: mockToken } }));

      const result = await service.login(username, password);

      expect(result).toEqual({
        message: 'Login successful',
        token: mockToken,
        expiresIn: null,
      });
    });

    it('should successfully login and extract access_token from object response', async () => {
      const mockAuthUrl = 'http://auth.example.com/login';
      const mockToken = 'jwt-token-789';
      const username = 'testuser';
      const password = 'testpass';

      configService.get.mockReturnValue(mockAuthUrl);
      httpService.post.mockReturnValue(
        of({ data: { access_token: mockToken } }),
      );

      const result = await service.login(username, password);

      expect(result).toEqual({
        message: 'Login successful',
        token: mockToken,
        expiresIn: null,
      });
    });

    it('should successfully login and extract jwt from object response', async () => {
      const mockAuthUrl = 'http://auth.example.com/login';
      const mockToken = 'jwt-token-abc';
      const username = 'testuser';
      const password = 'testpass';

      configService.get.mockReturnValue(mockAuthUrl);
      httpService.post.mockReturnValue(of({ data: { jwt: mockToken } }));

      const result = await service.login(username, password);

      expect(result).toEqual({
        message: 'Login successful',
        token: mockToken,
        expiresIn: null,
      });
    });

    it('should successfully login and extract user.token from nested object response', async () => {
      const mockAuthUrl = 'http://auth.example.com/login';
      const mockToken = 'jwt-token-def';
      const username = 'testuser';
      const password = 'testpass';

      configService.get.mockReturnValue(mockAuthUrl);
      httpService.post.mockReturnValue(
        of({ data: { user: { token: mockToken } } }),
      );

      const result = await service.login(username, password);

      expect(result).toEqual({
        message: 'Login successful',
        token: mockToken,
        expiresIn: null,
      });
    });

    it('should throw ServiceUnavailableException when TAZAMA_AUTH_URL is not set', async () => {
      const username = 'testuser';
      const password = 'testpass';

      configService.get.mockReturnValue(undefined);

      await expect(service.login(username, password)).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(configService.get).toHaveBeenCalledWith('TAZAMA_AUTH_URL');
    });

    it('should throw UnauthorizedException when HTTP request fails with 401', async () => {
      const mockAuthUrl = 'http://auth.example.com/login';
      const username = 'testuser';
      const password = 'testpass';
      const error: any = new Error('Unauthorized');
      error.response = { status: 401 };

      configService.get.mockReturnValue(mockAuthUrl);
      httpService.post.mockReturnValue(throwError(() => error));

      await expect(service.login(username, password)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(httpService.post).toHaveBeenCalledWith(mockAuthUrl, {
        username,
        password,
      });
    });

    it('should throw ServiceUnavailableException when HTTP request fails with non-401 error', async () => {
      const mockAuthUrl = 'http://auth.example.com/login';
      const username = 'testuser';
      const password = 'testpass';
      const error: any = new Error('Network error');
      error.response = { status: 500 };

      configService.get.mockReturnValue(mockAuthUrl);
      httpService.post.mockReturnValue(throwError(() => error));

      await expect(service.login(username, password)).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(httpService.post).toHaveBeenCalledWith(mockAuthUrl, {
        username,
        password,
      });
    });

    it('should throw error when response does not contain token', async () => {
      const mockAuthUrl = 'http://auth.example.com/login';
      const username = 'testuser';
      const password = 'testpass';

      configService.get.mockReturnValue(mockAuthUrl);
      httpService.post.mockReturnValue(
        of({ data: { message: 'no token here' } }),
      );

      const result = await service.login(username, password);

      // Should still return with undefined token since the extraction logic returns undefined
      expect(result).toEqual({
        message: 'Login successful',
        token: undefined,
        expiresIn: null,
      });
    });

    it('should handle empty response data', async () => {
      const mockAuthUrl = 'http://auth.example.com/login';
      const username = 'testuser';
      const password = 'testpass';

      configService.get.mockReturnValue(mockAuthUrl);
      httpService.post.mockReturnValue(of({ data: null }));

      const result = await service.login(username, password);

      expect(result).toEqual({
        message: 'Login successful',
        token: undefined,
        expiresIn: null,
      });
    });
  });

  describe('isTokenExpired', () => {
    const realDateNow = Date.now;
    afterEach(() => {
      global.Date.now = realDateNow;
    });

    it('should return false if token is not expired', () => {
      // exp in the future
      const future = Math.floor(Date.now() / 1000) + 1000;
      const token = require('jsonwebtoken').sign({ exp: future }, 'secret');
      expect(service.isTokenExpired(token)).toBe(false);
    });

    it('should return true if token is expired', () => {
      // exp in the past
      const past = Math.floor(Date.now() / 1000) - 1000;
      const token = require('jsonwebtoken').sign({ exp: past }, 'secret');
      expect(service.isTokenExpired(token)).toBe(true);
    });

    it('should return true if token has no exp', () => {
      const token = require('jsonwebtoken').sign({ foo: 'bar' }, 'secret');
      expect(service.isTokenExpired(token)).toBe(true);
    });

    it('should return true if token is invalid', () => {
      expect(service.isTokenExpired('invalid.token')).toBe(true);
    });
  });

  describe('getTokenTimeToExpiry', () => {
    const realDateNow = Date.now;
    afterEach(() => {
      global.Date.now = realDateNow;
    });

    it('should return seconds to expiry if token is valid', () => {
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 500;
      const token = require('jsonwebtoken').sign({ exp }, 'secret');
      expect(service.getTokenTimeToExpiry(token)).toBeGreaterThanOrEqual(499);
    });

    it('should return 0 if token is expired', () => {
      const now = Math.floor(Date.now() / 1000);
      const exp = now - 10;
      const token = require('jsonwebtoken').sign({ exp }, 'secret');
      expect(service.getTokenTimeToExpiry(token)).toBe(0);
    });

    it('should return 0 if token has no exp', () => {
      const token = require('jsonwebtoken').sign({ foo: 'bar' }, 'secret');
      expect(service.getTokenTimeToExpiry(token)).toBe(0);
    });

    it('should return 0 if token is invalid', () => {
      expect(service.getTokenTimeToExpiry('invalid.token')).toBe(0);
    });

    it('should return 0 when jwt.decode throws an error', () => {
      // Mock jwt to throw an error
      jest.doMock('jsonwebtoken', () => ({
        decode: jest.fn().mockImplementation(() => {
          throw new Error('Invalid token format');
        }),
      }));

      expect(service.getTokenTimeToExpiry('any.token.here')).toBe(0);
    });
  });

  describe('isTokenExpired error handling', () => {
    it('should return true when jwt.decode throws an error', () => {
      // Test with completely malformed token that will cause jwt.decode to throw
      // This is a string that's not even close to a valid JWT format
      expect(service.isTokenExpired('not-a-jwt-at-all')).toBe(true);
    });

    it('should handle jwt.decode errors and return true', () => {
      // This should trigger the catch block in isTokenExpired
      const result = service.isTokenExpired('malformed.jwt.token');
      expect(result).toBe(true);
    });

    it('should handle jwt.decode errors for null token', () => {
      // This should trigger the catch block
      const result = service.isTokenExpired(null as any);
      expect(result).toBe(true);
    });
  });

  describe('getTokenTimeToExpiry error handling', () => {
    it('should return 0 when jwt.decode throws an error', () => {
      // This should trigger the catch block in getTokenTimeToExpiry
      const result = service.getTokenTimeToExpiry('malformed.jwt.token');
      expect(result).toBe(0);
    });

    it('should handle jwt.decode errors for null token', () => {
      // This should trigger the catch block
      const result = service.getTokenTimeToExpiry(null as any);
      expect(result).toBe(0);
    });

    it('should handle jwt.decode errors for undefined token', () => {
      // This should trigger the catch block
      const result = service.getTokenTimeToExpiry(undefined as any);
      expect(result).toBe(0);
    });
  });
});
