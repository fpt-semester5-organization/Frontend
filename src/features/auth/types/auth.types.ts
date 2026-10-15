import type { AuthUser } from '@/stores/auth.store';

/** Kiểu theo `08. OpenAPI Specification.yaml` (LoginResponse / AnonymousResponse …). Field camelCase giống hệt API. */
export interface LoginResult {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  user: AuthUser & { accountStatus?: string; isProfileCompleted?: boolean };
}
export interface RegisterResult {
  email: string;
  otpExpiresIn: number;
}
export interface VerifyOtpResult extends LoginResult {
  redirectUrl?: string;
}
export interface AnonymousResult {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: number;
  role: 'GUEST';
  guestId: string;
  countryCode?: string;
}
