export interface IAuthRequestOtpRequest {
  email: string;
}

export interface IAuthRequestOtpResponse {
  message: string;
}

export interface IAuthVerifyOtpRequest {
  email: string;
  code: string;
}

export interface IAuthVerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    isVerified: boolean;
  };
}

export interface IAuthRefreshRequest {
  refreshToken: string;
}

export interface IAuthRefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    isVerified: boolean;
  };
}

export interface IUserProfileResponse {
  id: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}