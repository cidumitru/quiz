import {IsEmail, IsNotEmpty, IsString, Length} from 'class-validator';
import {IsGmailOnly} from '../../validators/gmail-only.validator';

export class RequestOtpDto {
  @IsEmail()
  @IsNotEmpty()
  @IsGmailOnly()
  email: string;
}

export class VerifyOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Length(6, 6)
  code: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// Type exports for frontend usage
export type RequestOtpRequest = RequestOtpDto;
export type VerifyOtpRequest = VerifyOtpDto;
export type RefreshTokenRequest = RefreshTokenDto;
