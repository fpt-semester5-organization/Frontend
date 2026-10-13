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
  guestFeedPostsBeforePrompt: 5,
} as const;

export const MEDICAL_DISCLAIMER =
  'Khuyến nghị mang tính chất tham khảo dinh dưỡng, vui lòng tham vấn ý kiến bác sĩ chuyên khoa đối với các bệnh lý nền.';
