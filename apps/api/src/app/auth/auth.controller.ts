import {Body, Controller, Post, ValidationPipe} from '@nestjs/common';
import {AuthService} from './auth.service';
import {
  RefreshTokenDto,
  RefreshTokenResponse,
  RequestOtpDto,
  RequestOtpResponse,
  VerifyOtpDto,
  VerifyOtpResponse,
} from '@aqb/data-access';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-otp')
  async requestOtp(
    @Body(ValidationPipe) requestOtpDto: RequestOtpDto,
  ): Promise<RequestOtpResponse> {
    return this.authService.requestOtp(requestOtpDto);
  }

  @Post('verify-otp')
  async verifyOtp(
    @Body(ValidationPipe) verifyOtpDto: VerifyOtpDto,
  ): Promise<VerifyOtpResponse> {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @Post('refresh')
  async refreshToken(
    @Body(ValidationPipe) refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokenResponse> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }
}
