import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { User, OtpCode } from '../entities';
import { RequestOtpDto, VerifyOtpDto } from '@aqb/data-access';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let otpRepository: Repository<OtpCode>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let emailService: EmailService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockOtpRepository = {
    count: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockEmailService = {
    sendOtpEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(OtpCode),
          useValue: mockOtpRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    otpRepository = module.get<Repository<OtpCode>>(getRepositoryToken(OtpCode));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestOtp', () => {
    const validGmailDto: RequestOtpDto = { email: 'test@gmail.com' };

    it('should successfully send OTP to valid Gmail account', async () => {
      const mockUser = { id: 'user-id', email: 'test@gmail.com' };
      const mockOtpCode = { id: 'otp-id', code: '123456', userId: 'user-id' };

      mockOtpRepository.count.mockResolvedValue(0);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOtpRepository.update.mockResolvedValue({ affected: 1 });
      mockOtpRepository.create.mockReturnValue(mockOtpCode);
      mockOtpRepository.save.mockResolvedValue(mockOtpCode);
      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await service.requestOtp(validGmailDto);

      expect(result).toEqual({ message: 'OTP sent to your email' });
      expect(mockEmailService.sendOtpEmail).toHaveBeenCalledWith(
        'test@gmail.com',
        expect.any(String)
      );
    });

    it('should create new user if user does not exist', async () => {
      const newUser = { id: 'new-user-id', email: 'newuser@gmail.com' };
      const mockOtpCode = { id: 'otp-id', code: '123456', userId: 'new-user-id' };

      mockOtpRepository.count.mockResolvedValue(0);
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockOtpRepository.update.mockResolvedValue({ affected: 0 });
      mockOtpRepository.create.mockReturnValue(mockOtpCode);
      mockOtpRepository.save.mockResolvedValue(mockOtpCode);
      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      const result = await service.requestOtp(validGmailDto);

      expect(mockUserRepository.create).toHaveBeenCalledWith({ email: 'test@gmail.com' });
      expect(mockUserRepository.save).toHaveBeenCalledWith(newUser);
      expect(result).toEqual({ message: 'OTP sent to your email' });
    });

    it('should throw BadRequestException for non-Gmail account', async () => {
      const nonGmailDto: RequestOtpDto = { email: 'test@yahoo.com' };

      await expect(service.requestOtp(nonGmailDto)).rejects.toThrow(
        new BadRequestException('Only Gmail accounts are allowed for registration')
      );
    });

    it('should throw BadRequestException for too many OTP requests', async () => {
      mockOtpRepository.count.mockResolvedValue(10);

      await expect(service.requestOtp(validGmailDto)).rejects.toThrow(
        new BadRequestException('Too many OTP requests. Please wait 2 minutes.')
      );
    });

    it('should validate OTP request limit with correct time window', async () => {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      mockOtpRepository.count.mockImplementation((options) => {
        expect(options.where.createdAt).toEqual(MoreThan(expect.any(Date)));
        return Promise.resolve(5);
      });
      
      mockUserRepository.findOne.mockResolvedValue({ id: 'user-id', email: 'test@gmail.com' });
      mockOtpRepository.update.mockResolvedValue({ affected: 1 });
      mockOtpRepository.create.mockReturnValue({ id: 'otp-id', code: '123456' });
      mockOtpRepository.save.mockResolvedValue({ id: 'otp-id', code: '123456' });
      mockEmailService.sendOtpEmail.mockResolvedValue(undefined);

      await service.requestOtp(validGmailDto);

      expect(mockOtpRepository.count).toHaveBeenCalledWith({
        where: {
          user: { email: 'test@gmail.com' },
          createdAt: expect.any(Object), // MoreThan object
        },
      });
    });
  });

  describe('verifyOtp', () => {
    const verifyDto: VerifyOtpDto = { email: 'test@gmail.com', code: '123456' };

    it('should successfully verify OTP and return tokens', async () => {
      const mockUser = { id: 'user-id', email: 'test@gmail.com', isVerified: false };
      const mockOtpCode = { 
        id: 'otp-id', 
        code: '123456', 
        isUsed: false, 
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) 
      };
      const mockTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOtpRepository.findOne.mockResolvedValue(mockOtpCode);
      mockOtpRepository.save.mockResolvedValue({ ...mockOtpCode, isUsed: true });
      mockUserRepository.save.mockResolvedValue({ ...mockUser, isVerified: true });
      
      // Mock the private generateTokens method by mocking JWT service
      mockJwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      mockConfigService.get
        .mockReturnValueOnce('refresh-secret')
        .mockReturnValueOnce('7d');

      const result = await service.verifyOtp(verifyDto);

      expect(result).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-id',
          email: 'test@gmail.com',
          isVerified: true,
        },
      });
      expect(mockOtpCode.isUsed).toBe(true);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyOtp(verifyDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      );
    });

    it('should throw UnauthorizedException for invalid OTP code', async () => {
      const mockUser = { id: 'user-id', email: 'test@gmail.com' };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOtpRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyOtp(verifyDto)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired OTP')
      );
    });

    it('should throw UnauthorizedException for expired OTP', async () => {
      const mockUser = { id: 'user-id', email: 'test@gmail.com' };
      const expiredOtpCode = { 
        id: 'otp-id', 
        code: '123456', 
        isUsed: false, 
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockOtpRepository.findOne.mockResolvedValue(null); // Will return null for expired OTP

      await expect(service.verifyOtp(verifyDto)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired OTP')
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens for valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockUser = { id: 'user-id', email: 'test@gmail.com', isVerified: true };
      const mockPayload = { sub: 'user-id', email: 'test@gmail.com' };

      mockConfigService.get.mockReturnValue('refresh-secret');
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      mockConfigService.get
        .mockReturnValueOnce('refresh-secret')
        .mockReturnValueOnce('7d');

      const result = await service.refreshToken(refreshToken);

      expect(result).toMatchObject({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: 'user-id',
          email: 'test@gmail.com',
          isVerified: true,
        },
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const invalidRefreshToken = 'invalid-refresh-token';

      mockConfigService.get.mockReturnValue('refresh-secret');
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(invalidRefreshToken)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token')
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { sub: 'non-existent-user-id', email: 'test@gmail.com' };

      mockConfigService.get.mockReturnValue('refresh-secret');
      mockJwtService.verify.mockReturnValue(mockPayload);
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token')
      );
    });
  });

  describe('Gmail validation', () => {
    it('should accept standard gmail.com accounts', () => {
      const result = service['isGmailAccount']('test@gmail.com');
      expect(result).toBe(true);
    });

    it('should accept googlemail.com accounts', () => {
      const result = service['isGmailAccount']('test@googlemail.com');
      expect(result).toBe(true);
    });

    it('should reject non-Gmail accounts', () => {
      const result = service['isGmailAccount']('test@yahoo.com');
      expect(result).toBe(false);
    });

    it('should handle case insensitive emails', () => {
      const result = service['isGmailAccount']('TEST@GMAIL.COM');
      expect(result).toBe(true);
    });

    it('should handle emails with whitespace', () => {
      const result = service['isGmailAccount']('  test@gmail.com  ');
      expect(result).toBe(true);
    });
  });

  describe('OTP generation', () => {
    it('should generate 6-digit OTP codes', () => {
      const otp = service['generateOtpCode']();
      expect(otp).toMatch(/^\d{6}$/);
      expect(parseInt(otp, 10)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(otp, 10)).toBeLessThanOrEqual(999999);
    });

    it('should generate different OTP codes', () => {
      const otp1 = service['generateOtpCode']();
      const otp2 = service['generateOtpCode']();
      // While theoretically possible to be the same, practically very unlikely
      expect(otp1).not.toBe(otp2);
    });
  });
});