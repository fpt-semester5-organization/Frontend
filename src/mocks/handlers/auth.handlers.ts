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
    if (!user || body.password !== MOCK_PASSWORD) {
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
];
