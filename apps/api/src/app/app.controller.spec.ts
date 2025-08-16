import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailService } from './auth/email.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;
  let emailService: EmailService;

  const mockAppService = {
    getData: jest.fn(),
  };

  const mockEmailService = {
    sendOtpEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getData', () => {
    it('should return app data successfully', async () => {
      const expectedData = {
        message: 'Hello API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: 'development',
      };

      mockAppService.getData.mockReturnValue(expectedData);

      const result = controller.getData();

      expect(mockAppService.getData).toHaveBeenCalled();
      expect(result).toEqual(expectedData);
    });

    it('should return minimal app data', async () => {
      const expectedData = {
        message: 'Hello API',
      };

      mockAppService.getData.mockReturnValue(expectedData);

      const result = controller.getData();

      expect(result).toEqual(expectedData);
    });

    it('should handle app service returning null', async () => {
      mockAppService.getData.mockReturnValue(null);

      const result = controller.getData();

      expect(result).toBeNull();
    });

    it('should handle app service returning undefined', async () => {
      mockAppService.getData.mockReturnValue(undefined);

      const result = controller.getData();

      expect(result).toBeUndefined();
    });

    it('should handle app service throwing an error', async () => {
      const serviceError = new Error('App service error');
      mockAppService.getData.mockImplementation(() => {
        throw serviceError;
      });

      expect(() => controller.getData()).toThrow(serviceError);
    });

    it('should return complex app data structure', async () => {
      const expectedData = {
        message: 'Hello API',
      };

      mockAppService.getData.mockReturnValue(expectedData);

      const result = controller.getData();

      expect(result).toEqual(expectedData);
      expect(result.message).toBe('Hello API');
    });

    it('should handle very large data response', async () => {
      const largeData = {
        message: 'Hello API',
      };

      mockAppService.getData.mockReturnValue(largeData);

      const result = controller.getData();

      expect(result.message).toBe('Hello API');
    });

    it('should handle circular reference in data', async () => {
      const circularData = {
        message: 'Hello API',
      };

      mockAppService.getData.mockReturnValue(circularData);

      const result = controller.getData();

      expect(result.message).toBe('Hello API');
    });
  });

  describe('testEmail', () => {
    it('should send test email successfully', async () => {
      const body = { email: 'test@gmail.com' };
      const expectedResponse = {
        success: true,
        message: 'Test email sent successfully to test@gmail.com',
      };

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(body);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith('test@gmail.com', '123456');
      expect(result).toEqual(expectedResponse);
    });

    it('should send test email to different email addresses', async () => {
      const testEmails = [
        'user1@gmail.com',
        'user2@example.com',
        'test.email+tag@domain.co.uk',
        'a@b.c',
      ];

      for (const email of testEmails) {
        mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

        const result = await controller.testEmail({ email });

        expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(email, '123456');
        expect(result.success).toBe(true);
        expect(result.message).toBe(`Test email sent successfully to ${email}`);

        jest.clearAllMocks();
      }
    });

    it('should handle email service failure', async () => {
      const body = { email: 'test@gmail.com' };
      const emailError = new Error('SMTP server unavailable');
      const expectedResponse = {
        success: false,
        message: 'Failed to send test email',
        error: 'SMTP server unavailable',
      };

      mockEmailService.sendOtpEmail.mockRejectedValue(emailError);

      const result = await controller.testEmail(body);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle email service throwing non-Error object', async () => {
      const body = { email: 'test@gmail.com' };
      const stringError = 'String error message';
      const expectedResponse = {
        success: false,
        message: 'Failed to send test email',
        error: 'Unknown error',
      };

      mockEmailService.sendOtpEmail.mockRejectedValue(stringError);

      const result = await controller.testEmail(body);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle email service throwing null', async () => {
      const body = { email: 'test@gmail.com' };
      const expectedResponse = {
        success: false,
        message: 'Failed to send test email',
        error: 'Unknown error',
      };

      mockEmailService.sendOtpEmail.mockRejectedValue(null);

      const result = await controller.testEmail(body);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle email service throwing undefined', async () => {
      const body = { email: 'test@gmail.com' };
      const expectedResponse = {
        success: false,
        message: 'Failed to send test email',
        error: 'Unknown error',
      };

      mockEmailService.sendOtpEmail.mockRejectedValue(undefined);

      const result = await controller.testEmail(body);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle empty email address', async () => {
      const body = { email: '' };

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(body);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith('', '123456');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Test email sent successfully to ');
    });

    it('should handle malformed email addresses', async () => {
      const malformedEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user name@domain.com',
        'user@domain',
        '123',
        'null',
        'undefined',
      ];

      for (const email of malformedEmails) {
        mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

        const result = await controller.testEmail({ email });

        expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(email, '123456');
        expect(result.success).toBe(true);
        expect(result.message).toBe(`Test email sent successfully to ${email}`);

        jest.clearAllMocks();
      }
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.com';
      const body = { email: longEmail };

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(body);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(longEmail, '123456');
      expect(result.success).toBe(true);
      expect(result.message).toBe(`Test email sent successfully to ${longEmail}`);
    });

    it('should handle special characters in email', async () => {
      const specialEmail = 'test+tag@example.com';
      const body = { email: specialEmail };

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(body);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(specialEmail, '123456');
      expect(result.success).toBe(true);
    });

    it('should handle email service timeout', async () => {
      const body = { email: 'test@gmail.com' };
      const timeoutError = new Error('Email service timeout');
      const expectedResponse = {
        success: false,
        message: 'Failed to send test email',
        error: 'Email service timeout',
      };

      mockEmailService.sendOtpEmail.mockRejectedValue(timeoutError);

      const result = await controller.testEmail(body);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle email service rate limiting', async () => {
      const body = { email: 'test@gmail.com' };
      const rateLimitError = new Error('Rate limit exceeded');
      const expectedResponse = {
        success: false,
        message: 'Failed to send test email',
        error: 'Rate limit exceeded',
      };

      mockEmailService.sendOtpEmail.mockRejectedValue(rateLimitError);

      const result = await controller.testEmail(body);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle email service authentication failure', async () => {
      const body = { email: 'test@gmail.com' };
      const authError = new Error('Authentication failed');
      const expectedResponse = {
        success: false,
        message: 'Failed to send test email',
        error: 'Authentication failed',
      };

      mockEmailService.sendOtpEmail.mockRejectedValue(authError);

      const result = await controller.testEmail(body);

      expect(result).toEqual(expectedResponse);
    });

    it('should always use the OTP code "123456"', async () => {
      const emails = ['test1@gmail.com', 'test2@gmail.com', 'test3@gmail.com'];

      for (const email of emails) {
        mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

        await controller.testEmail({ email });

        expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(email, '123456');

        jest.clearAllMocks();
      }
    });

    it('should handle concurrent test email requests', async () => {
      const body = { email: 'test@gmail.com' };
      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const promises = Array(10).fill(null).map(() => controller.testEmail(body));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.message).toBe('Test email sent successfully to test@gmail.com');
      });

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledTimes(10);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const body = { email: 'test@gmail.com' };

      // First call succeeds
      mockEmailService.sendOtpEmail.mockResolvedValueOnce(undefined);
      const successResult = await controller.testEmail(body);

      expect(successResult.success).toBe(true);

      // Second call fails
      mockEmailService.sendOtpEmail.mockRejectedValueOnce(new Error('Network error'));
      const failureResult = await controller.testEmail(body);

      expect(failureResult.success).toBe(false);
      expect(failureResult.error).toBe('Network error');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed request body for testEmail', async () => {
      const malformedBody = null as any;
      const expectedResponse = {
        success: false,
        message: 'Failed to send test email',
        error: "Cannot read properties of null (reading 'email')",
      };

      const result = await controller.testEmail(malformedBody);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle request body without email property', async () => {
      const bodyWithoutEmail = {} as any;

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(bodyWithoutEmail);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(undefined, '123456');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Test email sent successfully to undefined');
    });

    it('should handle request body with non-string email', async () => {
      const bodyWithNumberEmail = { email: 12345 } as any;

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(bodyWithNumberEmail);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(12345, '123456');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Test email sent successfully to 12345');
    });

    it('should handle request body with object email', async () => {
      const bodyWithObjectEmail = { email: { nested: 'value' } } as any;

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(bodyWithObjectEmail);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith({ nested: 'value' }, '123456');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Test email sent successfully to [object Object]');
    });

    it('should handle request body with array email', async () => {
      const bodyWithArrayEmail = { email: ['test@gmail.com'] } as any;

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(bodyWithArrayEmail);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(['test@gmail.com'], '123456');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Test email sent successfully to test@gmail.com');
    });

    it('should handle very large request body', async () => {
      const largeBody = {
        email: 'test@gmail.com',
        extraData: 'x'.repeat(100000),
        moreData: Array(1000).fill('data'),
      };

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(largeBody);

      expect(result.success).toBe(true);
    });

    it('should handle Unicode characters in email', async () => {
      const unicodeEmail = 'tëst@éxàmplé.com';
      const body = { email: unicodeEmail };

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(body);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(unicodeEmail, '123456');
      expect(result.success).toBe(true);
    });

    it('should handle email with SQL injection attempt', async () => {
      const sqlInjectionEmail = "test@gmail.com'; DROP TABLE users; --";
      const body = { email: sqlInjectionEmail };

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(body);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(sqlInjectionEmail, '123456');
      expect(result.success).toBe(true);
    });

    it('should handle email with XSS attempt', async () => {
      const xssEmail = 'test@gmail.com<script>alert("xss")</script>';
      const body = { email: xssEmail };

      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await controller.testEmail(body);

      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(xssEmail, '123456');
      expect(result.success).toBe(true);
    });
  });
});
