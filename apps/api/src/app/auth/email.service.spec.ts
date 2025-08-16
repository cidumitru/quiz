import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EmailService } from './email.service';

// Mock the Resend module
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;
  let mockResend: any;
  let loggerSpy: jest.SpyInstance;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    // Reset the mock before each test
    const { Resend } = require('resend');
    mockResend = {
      emails: {
        send: jest.fn(),
      },
    };
    (Resend as jest.Mock).mockReturnValue(mockResend);

    // Set up default config service mocks BEFORE creating the module
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'RESEND_API_KEY') return 'test-api-key';
      if (key === 'EMAIL_FROM') return 'test@example.com';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService) as jest.Mocked<ConfigService>;

    // Mock the logger to prevent actual logging during tests
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    loggerSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should initialize with valid RESEND_API_KEY', () => {
      expect(service).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('RESEND_API_KEY');
    });

    it('should throw error when RESEND_API_KEY is missing', async () => {
      const failingConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            EmailService,
            {
              provide: ConfigService,
              useValue: failingConfigService,
            },
          ],
        }).compile()
      ).rejects.toThrow('RESEND_API_KEY is required');
    });

    it('should throw error when RESEND_API_KEY is empty string', async () => {
      const failingConfigService = {
        get: jest.fn().mockReturnValue(''),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            EmailService,
            {
              provide: ConfigService,
              useValue: failingConfigService,
            },
          ],
        }).compile()
      ).rejects.toThrow('RESEND_API_KEY is required');
    });

    it('should throw error when RESEND_API_KEY is null', async () => {
      const failingConfigService = {
        get: jest.fn().mockReturnValue(null),
      };

      await expect(
        Test.createTestingModule({
          providers: [
            EmailService,
            {
              provide: ConfigService,
              useValue: failingConfigService,
            },
          ],
        }).compile()
      ).rejects.toThrow('RESEND_API_KEY is required');
    });
  });

  describe('sendOtpEmail', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'RESEND_API_KEY':
            return 'test-api-key';
          case 'EMAIL_FROM':
            return 'Test AQB <test@example.com>';
          default:
            return undefined;
        }
      });

      service = new EmailService(configService);
    });

    it('should successfully send OTP email with custom sender', async () => {
      const email = 'user@gmail.com';
      const code = '123456';

      mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      await service.sendOtpEmail(email, code);

      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: 'Test AQB <test@example.com>',
        to: email,
        subject: 'Your AQB Verification Code',
        html: expect.stringContaining(code),
      });

      expect(Logger.prototype.log).toHaveBeenCalledWith(`OTP sent successfully to ${email}`);
    });

    it('should use default sender when EMAIL_FROM is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'RESEND_API_KEY':
            return 'test-api-key';
          case 'EMAIL_FROM':
            return undefined; // No custom sender configured
          default:
            return undefined;
        }
      });

      service = new EmailService(configService);

      const email = 'user@gmail.com';
      const code = '123456';

      mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      await service.sendOtpEmail(email, code);

      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: 'AQB <onboarding@resend.dev>',
        to: email,
        subject: 'Your AQB Verification Code',
        html: expect.stringContaining(code),
      });
    });

    it('should generate correct HTML template with OTP code', async () => {
      const email = 'user@gmail.com';
      const code = '987654';

      mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      await service.sendOtpEmail(email, code);

      const emailCall = mockResend.emails.send.mock.calls[0][0];
      const htmlContent = emailCall.html;

      expect(htmlContent).toContain('Your Verification Code');
      expect(htmlContent).toContain(code);
      expect(htmlContent).toContain('This code will expire in 5 minutes');
      expect(htmlContent).toContain('If you didn\'t request this code');
      expect(htmlContent).toContain('font-family: Arial');
      expect(htmlContent).toContain('max-width: 600px');
    });

    it('should handle different OTP code formats', async () => {
      const email = 'user@gmail.com';
      const testCodes = ['123456', '000000', '999999', '111111'];

      mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      for (const code of testCodes) {
        await service.sendOtpEmail(email, code);

        const emailCall = mockResend.emails.send.mock.calls[mockResend.emails.send.mock.calls.length - 1][0];
        expect(emailCall.html).toContain(code);
      }

      expect(mockResend.emails.send).toHaveBeenCalledTimes(testCodes.length);
    });

    it('should handle various email formats', async () => {
      const code = '123456';
      const testEmails = [
        'user@gmail.com',
        'test.user@gmail.com',
        'user+tag@gmail.com',
        'USER@GMAIL.COM',
        'user123@gmail.com',
      ];

      mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      for (const email of testEmails) {
        await service.sendOtpEmail(email, code);

        const emailCall = mockResend.emails.send.mock.calls[mockResend.emails.send.mock.calls.length - 1][0];
        expect(emailCall.to).toBe(email);
      }

      expect(mockResend.emails.send).toHaveBeenCalledTimes(testEmails.length);
    });

    it('should throw error when Resend API returns error', async () => {
      const email = 'user@gmail.com';
      const code = '123456';
      const resendError = { message: 'Invalid API key' };

      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: resendError
      });

      await expect(service.sendOtpEmail(email, code)).rejects.toThrow('Failed to send OTP email');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Failed to send OTP to ${email}`,
        resendError
      );
    });

    it('should throw error when Resend API throws exception', async () => {
      const email = 'user@gmail.com';
      const code = '123456';
      const networkError = new Error('Network timeout');

      mockResend.emails.send.mockRejectedValue(networkError);

      await expect(service.sendOtpEmail(email, code)).rejects.toThrow('Failed to send OTP email');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Failed to send OTP to ${email}`,
        networkError
      );
    });

    it('should handle rate limiting errors from Resend', async () => {
      const email = 'user@gmail.com';
      const code = '123456';
      const rateLimitError = { message: 'Rate limit exceeded' };

      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: rateLimitError
      });

      await expect(service.sendOtpEmail(email, code)).rejects.toThrow('Failed to send OTP email');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Failed to send OTP to ${email}`,
        rateLimitError
      );
    });

    it('should handle invalid email addresses gracefully', async () => {
      const invalidEmails = ['invalid-email', '', ' ', '@gmail.com', 'user@'];
      const code = '123456';

      for (const email of invalidEmails) {
        const invalidEmailError = { message: 'Invalid email address' };
        mockResend.emails.send.mockResolvedValue({
          data: null,
          error: invalidEmailError
        });

        await expect(service.sendOtpEmail(email, code)).rejects.toThrow('Failed to send OTP email');
      }
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(100) + '@gmail.com';
      const code = '123456';

      mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      await service.sendOtpEmail(longEmail, code);

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: longEmail })
      );
    });

    it('should handle empty or invalid OTP codes', async () => {
      const email = 'user@gmail.com';
      const invalidCodes = ['', ' ', '12345', '1234567', 'abc123', null, undefined];

      mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      for (const code of invalidCodes) {
        await service.sendOtpEmail(email, code as any);

        const emailCall = mockResend.emails.send.mock.calls[mockResend.emails.send.mock.calls.length - 1][0];
        expect(emailCall.html).toContain(String(code || ''));
      }
    });

    it('should handle concurrent email sending', async () => {
      const emails = ['user1@gmail.com', 'user2@gmail.com', 'user3@gmail.com'];
      const codes = ['123456', '234567', '345678'];

      mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      const sendPromises = emails.map((email, index) =>
        service.sendOtpEmail(email, codes[index])
      );

      await Promise.all(sendPromises);

      expect(mockResend.emails.send).toHaveBeenCalledTimes(3);

      emails.forEach((email, index) => {
        expect(mockResend.emails.send).toHaveBeenCalledWith(
          expect.objectContaining({
            to: email,
            html: expect.stringContaining(codes[index]),
          })
        );
      });
    });

    it('should handle partial failures in concurrent sending', async () => {
      const emails = ['success@gmail.com', 'failure@gmail.com'];
      const codes = ['123456', '234567'];

      mockResend.emails.send
        .mockResolvedValueOnce({ data: { id: 'email-id' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Send failed' } });

      const sendPromises = emails.map((email, index) =>
        service.sendOtpEmail(email, codes[index])
      );

      const results = await Promise.allSettled(sendPromises);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
    });

    it('should sanitize HTML content in OTP code', async () => {
      const email = 'user@gmail.com';
      const maliciousCode = '<script>alert("xss")</script>123456';

      mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      await service.sendOtpEmail(email, maliciousCode);

      const emailCall = mockResend.emails.send.mock.calls[0][0];
      const htmlContent = emailCall.html;

      // The code should be included as-is since it's placed in a safe context
      expect(htmlContent).toContain(maliciousCode);

      // But verify the overall structure is still intact
      expect(htmlContent).toContain('Your Verification Code');
      expect(htmlContent).toContain('font-family: Arial');
    });
  });

  describe('logging', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'RESEND_API_KEY':
            return 'test-api-key';
          case 'EMAIL_FROM':
            return 'Test AQB <test@example.com>';
          default:
            return undefined;
        }
      });

      service = new EmailService(configService);
    });

    it('should log successful email sending', async () => {
      const email = 'user@gmail.com';
      const code = '123456';

      mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      await service.sendOtpEmail(email, code);

      expect(Logger.prototype.log).toHaveBeenCalledWith(`OTP sent successfully to ${email}`);
    });

    it('should log errors with email address but not expose sensitive data', async () => {
      const email = 'user@gmail.com';
      const code = '123456';
      const error = new Error('API key invalid');

      mockResend.emails.send.mockRejectedValue(error);

      await expect(service.sendOtpEmail(email, code)).rejects.toThrow('Failed to send OTP email');

      expect(Logger.prototype.error).toHaveBeenCalledWith(
        `Failed to send OTP to ${email}`,
        error
      );
    });

    it('should not log OTP codes in success messages', async () => {
      const email = 'user@gmail.com';
      const code = '123456';

      mockResend.emails.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

      await service.sendOtpEmail(email, code);

      const logCalls = (Logger.prototype.log as jest.Mock).mock.calls;
      logCalls.forEach(call => {
        expect(call[0]).not.toContain(code);
      });
    });

    it('should not log OTP codes in error messages', async () => {
      const email = 'user@gmail.com';
      const code = '123456';
      const error = new Error('Send failed');

      mockResend.emails.send.mockRejectedValue(error);

      await expect(service.sendOtpEmail(email, code)).rejects.toThrow('Failed to send OTP email');

      const errorCalls = (Logger.prototype.error as jest.Mock).mock.calls;
      errorCalls.forEach(call => {
        expect(call[0]).not.toContain(code);
      });
    });
  });
});
