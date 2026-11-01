/**
 * DTO dữ liệu tài liệu pháp lý của hệ thống VeggieLife (FN-AUTH-04).
 * Cung cấp liên kết ảnh độ phân giải cao phục vụ người dùng xem khi đăng ký tài khoản.
 */
export interface LegalDocumentsData {
  userAgreementUrl: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  veganDisclaimerUrl: string;
  medicalDisclaimer: string;
  updatedAt?: string | null;
}

export type LegalDocType = 'TERMS' | 'PRIVACY' | 'USER_AGREEMENT' | 'VEGAN_DISCLAIMER';

