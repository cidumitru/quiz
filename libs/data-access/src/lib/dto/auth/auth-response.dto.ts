// Response interfaces for auth endpoints
export interface RequestOtpResponse {
  message: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    isVerified: boolean;
  };
}

export interface VerifyOtpResponse extends AuthTokenResponse {
}

export interface RefreshTokenResponse extends AuthTokenResponse {
}

export interface UserProfileResponse {
  id: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteUserResponse {
  message: string;
}
