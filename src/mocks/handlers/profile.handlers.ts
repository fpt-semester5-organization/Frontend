import { http } from 'msw';
import { MOCK_PASSWORD } from '../db';
import { healthDto, newLogId, profileOf, type MockGender, type MockGoal, type MockRegion } from '../profileDb';
import { allergens, findSchool } from '../recipeDb';
import { api, currentUser, fail, latency, mockSession, ok, unauthorized, validationError } from '../utils';

// Mô phỏng FN-PROF-02..07 (docs/09. Task Cards). GET /users/me nằm ở auth.handlers (dùng chung khi khôi phục phiên).
// Thử lỗi khi dev: họ tên "#loi-he-thong" → 500; ảnh tên chứa "cloudinary-loi" → 502.

type Detail = { field: string; message: string };

const PHONE = /^0(3|5|7|8|9)[0-9]{8}$/;
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const ageOf = (dateOfBirth: string) => (Date.now() - new Date(`${dateOfBirth}T00:00:00Z`).getTime()) / (365.25 * 86_400_000);
const inRange = (value: unknown, min: number, max: number) => typeof value === 'number' && value >= min && value <= max;
const today = () => new Date().toISOString().slice(0, 10);

export const profileHandlers = [
  // PATCH /users/me — FN-PROF-02
  http.patch(api('/users/me'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const body = (await request.json()) as { fullName?: unknown; phoneNumber?: unknown };
    if (body.fullName === '#loi-he-thong') return fail(500, 'ERR_SYS_DATABASE_UNAVAILABLE', 'Không kết nối được cơ sở dữ liệu.');
    const details: Detail[] = [];
    if (body.fullName !== undefined) {
      const name = typeof body.fullName === 'string' ? body.fullName.trim() : '';
      if (name.length < 2 || name.length > 100) details.push({ field: 'fullName', message: 'Họ tên cần 2–100 ký tự.' });
    }
    if (body.phoneNumber !== undefined && body.phoneNumber !== '' && !(typeof body.phoneNumber === 'string' && PHONE.test(body.phoneNumber)))
      details.push({ field: 'phoneNumber', message: 'Số điện thoại không hợp lệ.' });
    if (details.length) return validationError(details);

    const profile = profileOf(me.userId);
    if (typeof body.fullName === 'string') me.fullName = body.fullName.trim();
    if (body.phoneNumber !== undefined) profile.phoneNumber = (body.phoneNumber as string) || null;
    return ok({ userId: me.userId, fullName: me.fullName, phoneNumber: profile.phoneNumber }, 'Cập nhật thông tin thành công.');
  }),

  // POST /users/me/avatar — FN-PROF-03
  http.post(api('/users/me/avatar'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const file = (await request.formData()).get('file');
    if (!(file instanceof File)) return validationError([{ field: 'file', message: 'Vui lòng chọn ảnh.' }]);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return fail(400, 'ERR_MEDIA_INVALID_FILE', 'Ảnh phải là JPEG, PNG hoặc WEBP.', [{ field: 'file', message: 'Ảnh phải là JPEG, PNG hoặc WEBP.' }]);
    }
    if (file.size > 5 * 1024 * 1024) return fail(413, 'ERR_MEDIA_FILE_TOO_LARGE', 'Ảnh vượt quá 5 MB.');
    if (file.name.includes('cloudinary-loi')) return fail(502, 'ERR_EXT_CLOUDINARY_FAILED', 'Kho ảnh đang gián đoạn, vui lòng thử lại sau.');
    const profile = profileOf(me.userId);
    profile.avatarUrl = URL.createObjectURL(file);
    return ok({ avatarUrl: profile.avatarUrl }, 'Cập nhật ảnh đại diện thành công.');
  }),

  // DELETE /users/me — FN-PROF-07 (ân hạn 30 ngày); tài khoản giả đều dùng mật khẩu chung MOCK_PASSWORD
  http.delete(api('/users/me'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const body = (await request.json()) as { confirmPassword?: string; reason?: string };
    if ((body.reason ?? '').length > 255) return validationError([{ field: 'reason', message: 'Lý do tối đa 255 ký tự.' }]);
    if (body.confirmPassword !== MOCK_PASSWORD) return fail(401, 'ERR_AUTH_INVALID_CREDENTIALS', 'Mật khẩu xác nhận không đúng.');
    mockSession.clear();
    const restoreDeadline = new Date(Date.now() + 30 * 86_400_000).toISOString();
    return ok({ restoreDeadline }, 'Tài khoản đã được vô hiệu hóa. Bạn có 30 ngày để khôi phục.');
  }),

  // PUT /users/me/health-profile — FN-PROF-04 (ghi kèm một mốc cân nặng)
  http.put(api('/users/me/health-profile'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const body = (await request.json()) as Record<string, unknown>;
    const details: Detail[] = [];
    if (!inRange(body.heightCm, 50, 250)) details.push({ field: 'heightCm', message: 'Chiều cao phải từ 50 đến 250 cm.' });
    if (!inRange(body.weightKg, 20, 300)) details.push({ field: 'weightKg', message: 'Cân nặng phải từ 20 đến 300 kg.' });
    if (!isDate(body.dateOfBirth) || ageOf(body.dateOfBirth) < 10) details.push({ field: 'dateOfBirth', message: 'Ngày sinh không hợp lệ hoặc chưa đủ 10 tuổi.' });
    if (!['MALE', 'FEMALE'].includes(body.gender as string)) details.push({ field: 'gender', message: 'Giới tính không hợp lệ.' });
    if (!['LOSE_WEIGHT', 'MAINTAIN', 'GAIN_MUSCLE'].includes(body.healthGoal as string)) details.push({ field: 'healthGoal', message: 'Mục tiêu không hợp lệ.' });
    if (body.targetWeightKg !== undefined && !inRange(body.targetWeightKg, 20, 300))
      details.push({ field: 'targetWeightKg', message: 'Cân nặng mục tiêu phải từ 20 đến 300 kg.' });
    if (body.regionPreference !== undefined && !['NORTH', 'CENTRAL', 'SOUTH'].includes(body.regionPreference as string))
      details.push({ field: 'regionPreference', message: 'Vùng miền không hợp lệ.' });
    if (details.length) return validationError(details);
    const school = findSchool(Number(body.dietarySchoolId));
    if (!school) return fail(404, 'ERR_DIET_SCHOOL_NOT_FOUND', 'Trường phái ăn chay không tồn tại.');

    const profile = profileOf(me.userId);
    profile.health = {
      gender: body.gender as MockGender,
      dateOfBirth: body.dateOfBirth as string,
      heightCm: body.heightCm as number,
      currentWeightKg: body.weightKg as number,
      targetWeightKg: (body.targetWeightKg as number | undefined) ?? null,
      healthGoal: body.healthGoal as MockGoal,
      dietarySchoolId: school.dietarySchoolId,
      // Trường phái kiêng ngũ vị tân thì luôn bật cờ này.
      requiresAlliumFree: school.forbidAllium || body.requiresAlliumFree === true,
      regionPreference: (body.regionPreference as MockRegion | undefined) ?? profile.health?.regionPreference ?? 'SOUTH',
      updatedAt: new Date().toISOString(),
    };
    profile.weights.push({ logId: newLogId(), weightKg: body.weightKg as number, loggedDate: today(), note: null });
    return ok(healthDto(profile.health), 'Cập nhật hồ sơ sức khỏe thành công.');
  }),

  // GET /users/me/weight-history — FN-PROF-06 (mới nhất trước)
  http.get(api('/users/me/weight-history'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const q = new URL(request.url).searchParams;
    const from = q.get('from');
    const to = q.get('to');
    const page = Number(q.get('page') ?? 1);
    const size = Number(q.get('size') ?? 20);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1 || size > 100) {
      return validationError([{ field: 'size', message: 'page ≥ 1, size trong khoảng 1–100.' }]);
    }
    const list = profileOf(me.userId)
      .weights.filter((w) => (!from || w.loggedDate >= from) && (!to || w.loggedDate <= to))
      .sort((a, b) => b.loggedDate.localeCompare(a.loggedDate) || b.logId - a.logId);
    const items = list.slice((page - 1) * size, page * size).map(({ logId, weightKg, loggedDate }) => ({ logId, weightKg, loggedDate }));
    return ok(items, 'OK', 200, { page, size, total: list.length });
  }),

  // POST /users/me/weight-history — FN-PROF-06
  http.post(api('/users/me/weight-history'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const body = (await request.json()) as { weightKg?: unknown; loggedDate?: unknown; note?: unknown };
    const details: Detail[] = [];
    if (!inRange(body.weightKg, 20, 300)) details.push({ field: 'weightKg', message: 'Cân nặng phải từ 20 đến 300 kg.' });
    if (body.loggedDate !== undefined && (!isDate(body.loggedDate) || body.loggedDate > today()))
      details.push({ field: 'loggedDate', message: 'Ngày ghi không hợp lệ.' });
    if (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 255))
      details.push({ field: 'note', message: 'Ghi chú tối đa 255 ký tự.' });
    if (details.length) return validationError(details);
    const profile = profileOf(me.userId);
    if (!profile.health) return fail(409, 'ERR_PROFILE_NOT_COMPLETED', 'Bạn cần lập hồ sơ sức khỏe trước khi ghi cân nặng.');

    const entry = {
      logId: newLogId(),
      weightKg: body.weightKg as number,
      loggedDate: (body.loggedDate as string | undefined) ?? today(),
      note: (body.note as string | undefined) ?? null,
    };
    profile.weights.push(entry);
    // Mốc mới nhất cập nhật lại cân nặng hiện tại và các chỉ số dẫn xuất.
    const latest = [...profile.weights].sort((a, b) => b.loggedDate.localeCompare(a.loggedDate) || b.logId - a.logId)[0];
    profile.health = { ...profile.health, currentWeightKg: latest.weightKg, updatedAt: new Date().toISOString() };
    const metrics = healthDto(profile.health);
    return ok({ logId: entry.logId, weightKg: entry.weightKg, bmi: metrics.bmi, targetDailyCalories: metrics.targetDailyCalories }, 'Đã ghi cân nặng.', 201);
  }),

  // PUT /users/me/allergies — FN-PROF-05 (thay toàn bộ, tối đa 20)
  http.put(api('/users/me/allergies'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const body = (await request.json()) as { allergens?: { allergenId?: number; notes?: string }[] };
    const list = Array.isArray(body.allergens) ? body.allergens : null;
    if (!list || list.length > 20) return validationError([{ field: 'allergens', message: 'Danh sách dị ứng tối đa 20 mục.' }]);
    if (list.some((item) => (item.notes ?? '').length > 255)) return validationError([{ field: 'allergens', message: 'Ghi chú tối đa 255 ký tự.' }]);
    const unknown = list.find((item) => !allergens.some((a) => a.allergenId === item.allergenId));
    if (unknown) return fail(404, 'ERR_ALLERGEN_NOT_FOUND', 'Có chất dị ứng không tồn tại trong danh mục.');

    const profile = profileOf(me.userId);
    profile.allergies = list.map((item) => ({ allergenId: item.allergenId as number, notes: item.notes?.trim() || null }));
    return ok(
      { allergens: profile.allergies.map((item) => ({ allergenId: item.allergenId, name: allergens.find((a) => a.allergenId === item.allergenId)?.allergenName ?? '' })) },
      'Cập nhật dị ứng thành công.'
    );
  }),
];
