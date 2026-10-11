export interface LoginReq {
  email: string;
  password: string;
  restoreAccount?: boolean;
}

export interface RegisterReq {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface VerifyOtpReq {
  email: string;
  otp: string;
}

export interface ForgotPasswordReq {
  email: string;
}

export interface ResetPasswordReq {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordReq {
  currentPassword: string;
  newPassword: string;
}
