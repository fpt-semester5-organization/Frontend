import { http, unwrap } from '@/api/http';
import { IS_MOCK } from '@/lib/env';
import type { LegalDocumentsData } from '../types/legal.types';

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const DEFAULT_LEGAL_DOCUMENTS: LegalDocumentsData = {
  userAgreementUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Ban_Cam_Ket_Va_Thoa_Thuan_Dang_Ky_Nguoi_Dung.png',
  privacyPolicyUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Chinh_Sach_Bao_Mat_Du_Lieu_VeggieLife.png',
  termsOfServiceUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Dieu_Khoan_Su_Dung_Dich_Vu_VeggieLife.png',
  veganDisclaimerUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Quy_Chuan_Am_Thuc_Chay_Va_Mien_Tru_Y_Te_VeggieLife.png',
  medicalDisclaimer: 'Khuyến nghị mang tính chất tham khảo dinh dưỡng, vui lòng tham vấn ý kiến bác sĩ chuyên khoa đối với các bệnh lý nền.',
  updatedAt: '2026-10-31T00:00:00Z',
};

/**
 * FN-AUTH-04: Tra cứu các tài liệu pháp lý bắt buộc phục vụ người dùng xem khi đăng ký tài khoản.
 * Endpoint: GET /api/v1/auth/legal-documents
 */
export const getLegalDocuments = async (): Promise<LegalDocumentsData> => {
  if (IS_MOCK) {
    await wait();
    return DEFAULT_LEGAL_DOCUMENTS;
  }
  const data = await unwrap<LegalDocumentsData>(http.get('/auth/legal-documents'));
  console.log(
    '%c[API BACKEND 200 OK] GET /api/v1/auth/legal-documents',
    'background: #1b5e20; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold;',
    data
  );
  return data;
};
