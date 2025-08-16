import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RequestOtpDto, VerifyOtpDto } from '@aqb/data-access';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let jwtService: JwtService;

  const mockAuthService = {
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
    refreshToken: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requestOtp', () => {
    it('should successfully request OTP for valid Gmail account', async () => {
      const dto: RequestOtpDto = { email: 'test@gmail.com' };
      const expectedResponse = { message: 'OTP sent to your email' };

      mockAuthService.requestOtp.mockResolvedValue(expectedResponse);

      const result = await controller.requestOtp(dto);

      expect(mockAuthService.requestOtp).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should throw BadRequestException for non-Gmail account', async () => {
      const dto: RequestOtpDto = { email: 'test@yahoo.com' };

      mockAuthService.requestOtp.mockRejectedValue(
        new BadRequestException('Only Gmail accounts are allowed for registration')
      );

      await expect(controller.requestOtp(dto)).rejects.toThrow(BadRequestException);
      expect(mockAuthService.requestOtp).toHaveBeenCalledWith(dto);
    });

    it('should throw BadRequestException for too many OTP requests', async () => {
      const dto: RequestOtpDto = { email: 'test@gmail.com' };

      mockAuthService.requestOtp.mockRejectedValue(
        new BadRequestException('Too many OTP requests. Please wait 2 minutes.')
      );

      await expect(controller.requestOtp(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyOtp', () => {
    it('should successfully verify OTP and return tokens', async () => {
      const dto: VerifyOtpDto = { email: 'test@gmail.com', code: '123456' };
      const expectedResponse = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-id',
          email: 'test@gmail.com',
          isVerified: true,
        },
      };

      mockAuthService.verifyOtp.mockResolvedValue(expectedResponse);

      const result = await controller.verifyOtp(dto);

      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });

    it('should throw UnauthorizedException for invalid OTP', async () => {
      const dto: VerifyOtpDto = { email: 'test@gmail.com', code: 'invalid' };

      mockAuthService.verifyOtp.mockRejectedValue(
        new UnauthorizedException('Invalid or expired OTP')
      );

      await expect(controller.verifyOtp(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const dto: VerifyOtpDto = { email: 'nonexistent@gmail.com', code: '123456' };

      mockAuthService.verifyOtp.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      );

      await expect(controller.verifyOtp(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh tokens', async () => {
      const refreshToken = 'valid-refresh-token';
      const expectedResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: 'user-id',
          email: 'test@gmail.com',
          isVerified: true,
        },
      };

      mockAuthService.refreshToken.mockResolvedValue(expectedResponse);

      const result = await controller.refreshToken({ refreshToken });

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual(expectedResponse);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token')
      );

      await expect(controller.refreshToken({ refreshToken })).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});