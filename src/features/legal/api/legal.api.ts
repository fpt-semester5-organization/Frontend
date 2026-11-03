import { http, unwrap } from '@/api/http';
import { IS_MOCK } from '@/lib/env';
import type { LegalDocumentsData } from '../types/legal.types';

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

export const DEFAULT_LEGAL_DOCUMENTS: LegalDocumentsData = {
  userAgreementUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/v1793718600/veggielife/legal/116_2025_QH15_666020.jpg',
  privacyPolicyUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/v1793718345/veggielife/legal/13_2023_ND-CP_465185.jpg',
  termsOfServiceUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/v1793718645/veggielife/legal/19_2023_QH15_500102.jpg',
  veganDisclaimerUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/v1793718667/veggielife/legal/142_2026_ND-CP_696080.jpg',
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
