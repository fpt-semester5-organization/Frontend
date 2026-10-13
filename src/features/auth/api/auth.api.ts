import { http } from '../../../api/http';
import type { LoginReq, RegisterReq, VerifyOtpReq, ForgotPasswordReq, ResetPasswordReq, ChangePasswordReq } from '../types/auth.types';

export const login = (data: LoginReq) => http.post('/auth/login', data);
export const register = (data: RegisterReq) => http.post('/auth/register', data);
export const verifyOtp = (data: VerifyOtpReq) => http.post('/auth/verify-otp', data);
export const forgotPassword = (data: ForgotPasswordReq) => http.post('/auth/forgot-password', data);
export const resetPassword = (data: ResetPasswordReq) => http.post('/auth/reset-password', data);
export const changePassword = (data: ChangePasswordReq) => http.put('/auth/password', data);
export const logout = () => http.post('/auth/logout');
