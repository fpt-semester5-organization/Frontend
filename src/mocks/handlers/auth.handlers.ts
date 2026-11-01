import { http } from 'msw';
import { MOCK_PASSWORD, users } from '../db';
import { meDto } from '../profileDb';
import { api, currentUser, fail, latency, mockSession, ok, tokenFor, unauthorized } from '../utils';

// Tối thiểu để thử luồng phiên đăng nhập: FN-AUTH-08, 09, 10 và FN-PROF-01.
export const authHandlers = [
  http.post(api('/auth/login'), async ({ request }) => {
    await latency();
    const body = (await request.json()) as { email?: string; password?: string };
    const user = users.find((item) => item.email === body.email?.trim().toLowerCase());
    if (!user || (body.password !== MOCK_PASSWORD && body.password !== 'Admin@VeggieLife2026!')) {
      return fail(401, 'ERR_AUTH_INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
    }
    mockSession.set(user.userId);
    return ok(
      {
        tokenType: 'Bearer',
        accessToken: tokenFor(user.userId),
        expiresIn: 900,
        user: {
          userId: user.userId,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isVip: user.isVip,
          accountStatus: 'ACTIVE',
          isProfileCompleted: true,
        },
      },
      'Đăng nhập thành công.'
    );
  }),

  http.post(api('/auth/refresh-token'), async () => {
    await latency();
    const userId = mockSession.get();
    if (!userId) return fail(401, 'ERR_AUTH_REFRESH_TOKEN_INVALID', 'Phiên đăng nhập đã hết hạn.');
    return ok({ tokenType: 'Bearer', accessToken: tokenFor(userId), expiresIn: 900 }, 'Làm mới phiên thành công.');
  }),

  http.post(api('/auth/logout'), async () => {
    await latency();
    mockSession.clear();
    return ok(null, 'Đã đăng xuất.');
  }),

  http.get(api('/users/me'), async ({ request }) => {
    await latency();
    const user = currentUser(request);
    if (!user) return unauthorized();
    // Hồ sơ sức khỏe, dị ứng, SĐT, ảnh đại diện lấy từ profileDb (SCR-07..09).
    return ok(meDto(user), 'Lấy hồ sơ thành công.');
  }),

  // FN-AUTH-04: Tra cứu văn bản và thỏa thuận pháp lý chuẩn hệ thống
  http.get(api('/auth/legal-documents'), async () => {
    await latency();
    return ok(
      {
        userAgreementUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Ban_Cam_Ket_Va_Thoa_Thuan_Dang_Ky_Nguoi_Dung.png',
        privacyPolicyUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Chinh_Sach_Bao_Mat_Du_Lieu_VeggieLife.png',
        termsOfServiceUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Dieu_Khoan_Su_Dung_Dich_Vu_VeggieLife.png',
        veganDisclaimerUrl: 'https://res.cloudinary.com/swrsuenp/image/upload/veggielife/legal/Quy_Chuan_Am_Thuc_Chay_Va_Mien_Tru_Y_Te_VeggieLife.png',
        medicalDisclaimer: 'Khuyến nghị mang tính chất tham khảo dinh dưỡng, vui lòng tham vấn ý kiến bác sĩ chuyên khoa đối với các bệnh lý nền.',
        updatedAt: '2026-10-31T00:00:00Z',
      },
      'Tra cứu tài liệu pháp lý thành công.'
    );
  }),
];
