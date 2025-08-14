import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OtpCode, User } from '../entities';
import { EmailService } from './email.service';
import {
  RefreshTokenResponse,
  RequestOtpDto,
  RequestOtpResponse,
  VerifyOtpDto,
  VerifyOtpResponse,
} from '@aqb/data-access';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OtpCode)
    private otpRepository: Repository<OtpCode>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService
  ) {}

  async requestOtp(requestOtpDto: RequestOtpDto): Promise<RequestOtpResponse> {
    const { email } = requestOtpDto;

    // Only allow Gmail accounts
    if (!this.isGmailAccount(email)) {
      throw new BadRequestException(
        'Only Gmail accounts are allowed for registration'
      );
    }

    const existingOtpCount = await this.otpRepository.count({
      where: {
        user: { email },
        createdAt: MoreThan(new Date(Date.now() - 2 * 60 * 1000)), // 2 minutes instead of 15
      },
    });

    if (existingOtpCount >= 10) {
      // 10 attempts instead of 3 for testing
      throw new BadRequestException(
        'Too many OTP requests. Please wait 2 minutes.'
      );
    }

    let user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      user = this.userRepository.create({ email });
      await this.userRepository.save(user);
    }

    await this.otpRepository.update(
      { userId: user.id, isUsed: false },
      { isUsed: true }
    );

    const code = this.generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otpCode = this.otpRepository.create({
      userId: user.id,
      code,
      expiresAt,
    });

    await this.otpRepository.save(otpCode);
    await this.emailService.sendOtpEmail(email, code);

    return { message: 'OTP sent to your email' };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<VerifyOtpResponse> {
    const { email, code } = verifyOtpDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const otpCode = await this.otpRepository.findOne({
      where: {
        userId: user.id,
        code,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!otpCode) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    otpCode.isUsed = true;
    await this.otpRepository.save(otpCode);

    user.isVerified = true;
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(user);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          isVerified: user.isVerified,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private isGmailAccount(email: string): boolean {
    const emailLower = email.toLowerCase().trim();
    // Check for standard gmail.com domain and googlemail.com (alternative Gmail domain)
    return (
      emailLower.endsWith('@gmail.com') ||
      emailLower.endsWith('@googlemail.com')
    );
  }

  private async generateTokens(user: User) {
    const payload = { email: user.email, sub: user.id };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
    });

    return { accessToken, refreshToken };
  }
}
