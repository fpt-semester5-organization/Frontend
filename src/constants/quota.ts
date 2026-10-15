/**
 * Hạn mức hiện hành — CHỈ ĐỂ HIỂN THỊ; server mới là nơi quyết định (Data Dictionary mục 3 & BR-USR-10, BR-PAY-SUB-01).
 * Số liệu lấy từ docs/10. Data Dictionary and Constants.docx.
 */
export const QUOTA = {
  guest: { ai: 3, barcodeDaily: 3, mapSearch: 3, mapRadiusKm: 5, rateLimitPerMinute: 10 },
  chatPerDay: { free: 20, vip: 200 },
  mealPlanPerWeek: { free: 1, vip: 3 },
  mealsPerPlan: 21,
  fridgeImagesPerDay: { free: 10, vip: 30 },
  memberMapRadiusKm: { min: 1, max: 10 },
  guestFeedPostsBeforePrompt: 5, // BR-GUEST-01: xem tới bài thứ 5 thì hiện popup đăng ký
} as const;

/** Giá seed gói VIP (D111) — Admin sửa được qua FN-ADM-13; giá thật lấy từ GET /vip-plans. */
export const VIP_PLAN_SEED = [
  { id: 'vip-30', days: 30, priceVnd: 49_000 },
  { id: 'vip-90', days: 90, priceVnd: 129_000 },
  { id: 'vip-365', days: 365, priceVnd: 449_000 },
] as const;

export const MEDICAL_DISCLAIMER =
  'Khuyến nghị mang tính chất tham khảo dinh dưỡng, vui lòng tham vấn ý kiến bác sĩ chuyên khoa đối với các bệnh lý nền.';

export const PASSWORD_RULE = 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt (BR-AUTH-001).';
export const OTP_TTL_SECONDS = 5 * 60;
