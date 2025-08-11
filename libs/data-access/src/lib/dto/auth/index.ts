// Request DTOs (classes with validation)
export {
  RequestOtpDto,
  VerifyOtpDto,
  RefreshTokenDto,
} from './auth-request.dto';

// Type exports for frontend
export type {
  RequestOtpRequest,
  VerifyOtpRequest,
  RefreshTokenRequest
} from './auth-request.dto';

// Response interfaces
export type {
  RequestOtpResponse,
  AuthTokenResponse,
  VerifyOtpResponse,
  RefreshTokenResponse,
  UserProfileResponse,
  DeleteUserResponse
} from './auth-response.dto';