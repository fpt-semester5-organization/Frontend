import { delay, http, HttpResponse } from 'msw';
import { addDays, formatDayMonth, isMonday, isoWeekday, todayInVietnam } from '@/features/meal-plans/lib/dates';
import { api, currentUser, fail, latency, ok, unauthorized, validationError } from '../utils';

// Mô phỏng FN-MEAL-01..08 (docs/09. Task Cards). Dữ liệu chỉ dùng khi dev; tải lại trang là về ban đầu.
// Thử các lỗi của POST /meal-plans bằng từ khóa trong "Ghi chú cho AI":
//   #ai-down → 503 ERR_AI_UNAVAILABLE · #fallback → thực đơn mẫu (generatedByAi = false)
//   #no-candidate → 422 ERR_MEAL_NO_CANDIDATE · #no-profile → 409 ERR_PROFILE_NOT_COMPLETED

type Aisle = 'PRODUCE' | 'PLANT_PROTEIN' | 'DRY_GOODS' | 'CONDIMENTS';
type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER';
type PlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'TEMPLATE';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const MEALS: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER'];
const AISLES: Aisle[] = ['PRODUCE', 'PLANT_PROTEIN', 'DRY_GOODS', 'CONDIMENTS'];
const EDIT_LIMIT = 21;
const PLANS_PER_WEEK = { free: 1, vip: 3 };
/** Calo mục tiêu mỗi ngày theo hồ sơ sức khỏe giả (gần tổng 3 bữa của món mẫu để thấy cả ngày đạt lẫn lệch). */
const TARGET_KCAL: Record<number, number> = { 1024: 1350, 2048: 1400 };
const AI_DELAY_MS = 4500;
const FALLBACK_DELAY_MS = 1500;

// Nguyên liệu đã chuẩn hóa về g/ml (BR-USR-13), mỗi nguyên liệu thuộc một quầy (D74).
const INGREDIENTS: Record<number, { name: string; unit: 'g' | 'ml'; aisle: Aisle }> = {
  1: { name: 'Gạo lứt', unit: 'g', aisle: 'DRY_GOODS' },
  2: { name: 'Yến mạch', unit: 'g', aisle: 'DRY_GOODS' },
  3: { name: 'Bún gạo', unit: 'g', aisle: 'DRY_GOODS' },
  4: { name: 'Bánh phở', unit: 'g', aisle: 'DRY_GOODS' },
  5: { name: 'Miến dong', unit: 'g', aisle: 'DRY_GOODS' },
  6: { name: 'Hạt chia', unit: 'g', aisle: 'DRY_GOODS' },
  7: { name: 'Gạo nếp', unit: 'g', aisle: 'DRY_GOODS' },
  8: { name: 'Rong biển khô', unit: 'g', aisle: 'DRY_GOODS' },
  10: { name: 'Đậu phụ', unit: 'g', aisle: 'PLANT_PROTEIN' },
  11: { name: 'Đậu xanh', unit: 'g', aisle: 'PLANT_PROTEIN' },
  12: { name: 'Đậu lăng', unit: 'g', aisle: 'PLANT_PROTEIN' },
  13: { name: 'Tempeh', unit: 'g', aisle: 'PLANT_PROTEIN' },
  14: { name: 'Sữa đậu nành', unit: 'ml', aisle: 'PLANT_PROTEIN' },
  15: { name: 'Đậu gà', unit: 'g', aisle: 'PLANT_PROTEIN' },
  20: { name: 'Nấm rơm', unit: 'g', aisle: 'PRODUCE' },
  21: { name: 'Nấm đùi gà', unit: 'g', aisle: 'PRODUCE' },
  22: { name: 'Cải thìa', unit: 'g', aisle: 'PRODUCE' },
  23: { name: 'Cà chua', unit: 'g', aisle: 'PRODUCE' },
  24: { name: 'Bí đỏ', unit: 'g', aisle: 'PRODUCE' },
  25: { name: 'Cà rốt', unit: 'g', aisle: 'PRODUCE' },
  26: { name: 'Rau muống', unit: 'g', aisle: 'PRODUCE' },
  27: { name: 'Chuối', unit: 'g', aisle: 'PRODUCE' },
  28: { name: 'Khoai lang', unit: 'g', aisle: 'PRODUCE' },
  29: { name: 'Bông cải xanh', unit: 'g', aisle: 'PRODUCE' },
  30: { name: 'Sả', unit: 'g', aisle: 'PRODUCE' },
  40: { name: 'Nước tương', unit: 'ml', aisle: 'CONDIMENTS' },
  41: { name: 'Dầu mè', unit: 'ml', aisle: 'CONDIMENTS' },
  42: { name: 'Muối', unit: 'g', aisle: 'CONDIMENTS' },
  43: { name: 'Tiêu', unit: 'g', aisle: 'CONDIMENTS' },
  44: { name: 'Hạt nêm chay', unit: 'g', aisle: 'CONDIMENTS' },
  45: { name: 'Bột cà ri', unit: 'g', aisle: 'CONDIMENTS' },
  46: { name: 'Nước cốt dừa', unit: 'ml', aisle: 'CONDIMENTS' },
};

const cover = (background: string, accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect width="160" height="100" fill="${background}"/><circle cx="112" cy="34" r="24" fill="${accent}" opacity="0.5"/><ellipse cx="66" cy="66" rx="42" ry="20" fill="#ffffff" opacity="0.85"/><circle cx="58" cy="60" r="8" fill="${accent}" opacity="0.7"/></svg>`
  )}`;
const SAGE = cover('#dfeadf', '#4f6f58');
const CLAY = cover('#f8e3d6', '#94532f');
const LINEN = cover('#f1ede8', '#7a4429');

interface MockRecipe {
  recipeId: number;
  title: string;
  mealType: MealType;
  kcal: number;
  imageUrl: string | null;
  /** [ingredientId, số lượng cho 1 khẩu phần] */
  ingredients: [number, number][];
}

const RECIPES: MockRecipe[] = [
  { recipeId: 101, title: 'Cháo yến mạch hạt chia', mealType: 'BREAKFAST', kcal: 320, imageUrl: SAGE, ingredients: [[2, 60], [6, 15], [14, 200], [27, 100]] },
  { recipeId: 102, title: 'Xôi đậu xanh', mealType: 'BREAKFAST', kcal: 350, imageUrl: CLAY, ingredients: [[7, 90], [11, 50], [42, 2]] },
  { recipeId: 103, title: 'Phở chay nấm', mealType: 'BREAKFAST', kcal: 380, imageUrl: LINEN, ingredients: [[4, 150], [20, 80], [22, 50], [44, 5]] },
  { recipeId: 104, title: 'Bún riêu chay', mealType: 'BREAKFAST', kcal: 360, imageUrl: null, ingredients: [[3, 150], [10, 100], [23, 120], [44, 5]] },
  { recipeId: 105, title: 'Khoai lang hấp & sữa đậu nành', mealType: 'BREAKFAST', kcal: 300, imageUrl: CLAY, ingredients: [[28, 200], [14, 250]] },
  { recipeId: 106, title: 'Cháo đậu xanh bí đỏ', mealType: 'BREAKFAST', kcal: 310, imageUrl: SAGE, ingredients: [[1, 40], [11, 40], [24, 120], [42, 2]] },
  { recipeId: 201, title: 'Cơm gạo lứt đậu phụ sốt cà', mealType: 'LUNCH', kcal: 520, imageUrl: CLAY, ingredients: [[1, 80], [10, 150], [23, 150], [40, 10]] },
  { recipeId: 202, title: 'Bún xào rau củ', mealType: 'LUNCH', kcal: 480, imageUrl: SAGE, ingredients: [[3, 150], [25, 60], [22, 80], [40, 15], [41, 5]] },
  { recipeId: 203, title: 'Cơm cà ri đậu gà', mealType: 'LUNCH', kcal: 560, imageUrl: LINEN, ingredients: [[1, 80], [15, 100], [28, 100], [45, 8], [46, 60]] },
  { recipeId: 204, title: 'Miến xào nấm', mealType: 'LUNCH', kcal: 450, imageUrl: null, ingredients: [[5, 80], [21, 120], [25, 50], [40, 10]] },
  { recipeId: 205, title: 'Cơm nấm kho tiêu', mealType: 'LUNCH', kcal: 500, imageUrl: CLAY, ingredients: [[1, 80], [20, 150], [40, 15], [43, 2]] },
  { recipeId: 206, title: 'Đậu lăng hầm rau củ', mealType: 'LUNCH', kcal: 470, imageUrl: SAGE, ingredients: [[12, 80], [25, 60], [23, 100], [24, 80], [42, 3]] },
  { recipeId: 207, title: 'Cơm tempeh xào sả', mealType: 'LUNCH', kcal: 540, imageUrl: LINEN, ingredients: [[1, 80], [13, 120], [30, 20], [40, 10]] },
  { recipeId: 208, title: 'Bún Huế chay', mealType: 'LUNCH', kcal: 500, imageUrl: null, ingredients: [[3, 150], [21, 100], [30, 20], [44, 6]] },
  { recipeId: 301, title: 'Canh nấm đậu phụ rong biển', mealType: 'DINNER', kcal: 450, imageUrl: SAGE, ingredients: [[1, 70], [20, 100], [10, 100], [8, 5]] },
  { recipeId: 302, title: 'Rau muống xào nước tương', mealType: 'DINNER', kcal: 420, imageUrl: null, ingredients: [[1, 70], [26, 200], [40, 10], [41, 5]] },
  { recipeId: 303, title: 'Lẩu nấm chay', mealType: 'DINNER', kcal: 480, imageUrl: CLAY, ingredients: [[20, 120], [21, 100], [10, 100], [22, 100], [44, 8]] },
  { recipeId: 304, title: 'Bông cải xanh xào đậu phụ', mealType: 'DINNER', kcal: 430, imageUrl: SAGE, ingredients: [[29, 150], [10, 120], [1, 70], [40, 10]] },
  { recipeId: 305, title: 'Bí đỏ hầm nước cốt dừa', mealType: 'DINNER', kcal: 440, imageUrl: LINEN, ingredients: [[24, 200], [46, 80], [10, 80], [42, 2]] },
  { recipeId: 306, title: 'Đậu phụ non sốt nấm', mealType: 'DINNER', kcal: 410, imageUrl: CLAY, ingredients: [[10, 150], [20, 100], [40, 15], [1, 60]] },
  { recipeId: 307, title: 'Canh bí đỏ đậu xanh', mealType: 'DINNER', kcal: 400, imageUrl: null, ingredients: [[24, 150], [11, 50], [1, 70], [42, 2]] },
  { recipeId: 308, title: 'Cơm chiên rau củ', mealType: 'DINNER', kcal: 460, imageUrl: SAGE, ingredients: [[1, 80], [25, 50], [29, 60], [40, 10], [41, 8]] },
];

interface MockSlot {
  slotId: number;
  dayOfWeek: (typeof DAYS)[number];
  mealType: MealType;
  recipeId: number;
  isCompleted: boolean;
}

interface MockPlan {
  planId: number;
  userId: number;
  planName: string;
  startDate: string;
  budgetTier: 'ECONOMICAL' | 'STANDARD' | 'PREMIUM';
  customInstructions: string | null;
  targetDailyKcal: number;
  planStatus: PlanStatus;
  generatedByAi: boolean;
  slots: MockSlot[];
  preDeployUsed: number;
  postDeployUsed: number;
}

interface MockShoppingList {
  listId: number;
  planId: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  items: { itemId: number; ingredientId: number; name: string; quantity: number; unit: string; aisle: Aisle; isPurchased: boolean }[];
}

const ids = { plan: 40, slot: 5000, list: 10, item: 900 };
const recipeById = (recipeId: number) => RECIPES.find((recipe) => recipe.recipeId === recipeId)!;
const mondayOf = (isoDate: string) => addDays(isoDate, 1 - isoWeekday(isoDate));

/** Xếp 21 bữa: mỗi bữa lấy món cùng loại, xoay vòng theo seed để mỗi thực đơn khác nhau. */
function buildSlots(seed: number): MockSlot[] {
  return DAYS.flatMap((dayOfWeek, index) =>
    MEALS.map((mealType) => {
      const pool = RECIPES.filter((recipe) => recipe.mealType === mealType);
      const offset = mealType === 'BREAKFAST' ? index : mealType === 'LUNCH' ? index * 3 : index * 5 + 1;
      return { slotId: ids.slot++, dayOfWeek, mealType, recipeId: pool[(offset + seed) % pool.length].recipeId, isCompleted: false };
    })
  );
}

function newPlan(
  userId: number,
  startDate: string,
  budgetTier: MockPlan['budgetTier'],
  customInstructions: string | null,
  planStatus: PlanStatus,
  generatedByAi = true
): MockPlan {
  const planId = ids.plan++;
  return {
    planId,
    userId,
    planName: `Thực đơn tuần ${formatDayMonth(startDate)}`,
    startDate,
    budgetTier,
    customInstructions,
    targetDailyKcal: TARGET_KCAL[userId] ?? 1700,
    planStatus,
    generatedByAi,
    slots: buildSlots(planId),
    preDeployUsed: 0,
    postDeployUsed: 0,
  };
}

// Dữ liệu mẫu theo tuần hiện tại: Nguyễn An (Free) có thực đơn tuần trước đã lưu trữ và tuần này đang áp dụng;
// Trần Bình (VIP) có bản nháp cho tuần sau.
const thisMonday = mondayOf(todayInVietnam());
const plans: MockPlan[] = (() => {
  const archived = newPlan(1024, addDays(thisMonday, -7), 'ECONOMICAL', null, 'ARCHIVED');
  archived.slots.forEach((slot) => (slot.isCompleted = true));
  const active = newPlan(1024, thisMonday, 'STANDARD', 'ít dầu, không cay', 'ACTIVE');
  const todayIndex = isoWeekday(todayInVietnam()) - 1;
  active.slots.forEach((slot) => {
    const dayIndex = DAYS.indexOf(slot.dayOfWeek);
    slot.isCompleted = dayIndex < todayIndex || (dayIndex === todayIndex && slot.mealType === 'BREAKFAST');
  });
  active.postDeployUsed = 3;
  const draft = newPlan(2048, addDays(thisMonday, 7), 'PREMIUM', null, 'DRAFT');
  draft.preDeployUsed = 2;
  return [archived, active, draft];
})();
const shoppingLists: MockShoppingList[] = [];

// --- DTO theo đúng response mẫu ---
const recipeDto = (recipeId: number) => {
  const recipe = recipeById(recipeId);
  return { recipeId, title: recipe.title, caloriesKcal: recipe.kcal, imageUrl: recipe.imageUrl };
};
const slotDto = (slot: MockSlot) => ({
  slotId: slot.slotId,
  dayOfWeek: slot.dayOfWeek,
  mealType: slot.mealType,
  isCompleted: slot.isCompleted,
  recipe: recipeDto(slot.recipeId),
});
const planDto = (plan: MockPlan) => ({
  planId: plan.planId,
  planName: plan.planName,
  startDate: plan.startDate,
  endDate: addDays(plan.startDate, 6),
  budgetTier: plan.budgetTier,
  customInstructions: plan.customInstructions,
  targetDailyKcal: plan.targetDailyKcal,
  planStatus: plan.planStatus,
  generatedByAi: plan.generatedByAi,
  slots: plan.slots.map(slotDto),
  edits: { preDeployUsed: plan.preDeployUsed, preDeployLimit: EDIT_LIMIT, postDeployUsed: plan.postDeployUsed, postDeployLimit: EDIT_LIMIT },
});
const listDto = (list: MockShoppingList) => ({
  listId: list.listId,
  planId: list.planId,
  status: list.status,
  progress: { purchased: list.items.filter((item) => item.isPurchased).length, total: list.items.length },
  aisles: AISLES.map((aisle) => ({
    aisle,
    items: list.items
      .filter((item) => item.aisle === aisle)
      .map(({ itemId, ingredientId, name, quantity, unit, isPurchased }) => ({ itemId, ingredientId, name, quantity, unit, isPurchased })),
  })).filter((aisle) => aisle.items.length > 0),
});

const planNotFound = () => fail(404, 'ERR_MEAL_PLAN_NOT_FOUND', 'Thực đơn không tồn tại hoặc không thuộc về bạn.');
const findOwnPlan = (id: unknown, userId: number) => plans.find((plan) => plan.planId === Number(id) && plan.userId === userId);
const readJson = async (request: Request): Promise<Record<string, unknown>> => {
  try {
    return ((await request.json()) as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
};

/** PDF tối giản để thử nút "Tải PDF". */
const SAMPLE_PDF = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 58>>stream
BT /F1 20 Tf 72 770 Td (VeggieLife - Thuc don tuan) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

export const mealPlansHandlers = [
  // GET /meal-plans — FN-MEAL-02
  http.get(api('/meal-plans'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('size') ?? 10);
    const mine = plans
      .filter((plan) => plan.userId === me.userId && plan.planStatus !== 'TEMPLATE')
      .sort((a, b) => b.startDate.localeCompare(a.startDate) || b.planId - a.planId);
    const items = mine
      .slice((page - 1) * size, page * size)
      .map(({ planId, planName, startDate, planStatus }) => ({ planId, planName, startDate, planStatus }));
    return ok(items, 'OK', 200, { page, size, total: mine.length });
  }),

  // POST /meal-plans — FN-MEAL-01
  http.post(api('/meal-plans'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const body = await readJson(request);
    const startDate = typeof body.startDate === 'string' ? body.startDate : '';
    const budgetTier = body.budgetTier as MockPlan['budgetTier'];
    const instructions = typeof body.customInstructions === 'string' ? body.customInstructions : '';

    const details: { field: string; message: string }[] = [];
    if (!isMonday(startDate)) details.push({ field: 'startDate', message: 'Ngày bắt đầu phải là Thứ Hai (YYYY-MM-DD).' });
    else if (startDate < todayInVietnam()) details.push({ field: 'startDate', message: 'Không tạo thực đơn cho tuần đã qua.' });
    if (!['ECONOMICAL', 'STANDARD', 'PREMIUM'].includes(budgetTier)) details.push({ field: 'budgetTier', message: 'Mức ngân sách không hợp lệ.' });
    if (instructions.length > 200) details.push({ field: 'customInstructions', message: 'Ghi chú tối đa 200 ký tự.' });
    if (details.length) return validationError(details);

    if (instructions.includes('#no-profile')) {
      return fail(409, 'ERR_PROFILE_NOT_COMPLETED', 'Bạn chưa có hồ sơ sức khỏe nên chưa tạo được thực đơn.');
    }
    // Hạn mức tuần (BR-PAY-SUB-01): Free 1, VIP 3 thực đơn cho cùng một tuần.
    const limit = me.isVip ? PLANS_PER_WEEK.vip : PLANS_PER_WEEK.free;
    const used = plans.filter((plan) => plan.userId === me.userId && plan.startDate === startDate && plan.planStatus !== 'TEMPLATE').length;
    if (used >= limit) {
      return fail(
        403,
        'ERR_QUOTA_MEAL_PLAN_EXCEEDED',
        me.isVip
          ? `Tuần này bạn đã tạo đủ ${limit} thực đơn của gói VIP.`
          : `Tuần này bạn đã tạo ${used}/${limit} thực đơn của gói Free.`
      );
    }
    if (instructions.includes('#no-candidate')) {
      await delay(FALLBACK_DELAY_MS);
      return fail(422, 'ERR_MEAL_NO_CANDIDATE', 'Kho công thức chưa đủ món hợp trường phái và dị ứng của bạn để xếp 21 bữa.');
    }
    if (instructions.includes('#ai-down')) {
      await delay(FALLBACK_DELAY_MS);
      return fail(503, 'ERR_AI_UNAVAILABLE', 'AI và thực đơn mẫu đều đang tạm gián đoạn. Vui lòng thử lại sau ít phút.');
    }

    const fallback = instructions.includes('#fallback');
    await delay(fallback ? FALLBACK_DELAY_MS : AI_DELAY_MS);
    const note = instructions.replace(/#[\w-]+/g, '').trim();
    const plan = newPlan(me.userId, startDate, budgetTier, note || null, 'DRAFT', !fallback);
    plans.push(plan);
    return ok(planDto(plan), 'Đã tạo thực đơn nháp.', 201);
  }),

  // GET /meal-plans/{id} — FN-MEAL-02
  http.get(api('/meal-plans/:id'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const plan = findOwnPlan(params.id, me.userId);
    return plan ? ok(planDto(plan)) : planNotFound();
  }),

  // POST /meal-plans/{id}/activate — FN-MEAL-02
  http.post(api('/meal-plans/:id/activate'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const plan = findOwnPlan(params.id, me.userId);
    if (!plan) return planNotFound();
    if (plan.planStatus !== 'DRAFT') return fail(409, 'ERR_MEAL_PLAN_NOT_DRAFT', 'Chỉ kích hoạt được thực đơn đang ở dạng nháp.');
    plans
      .filter((other) => other.userId === me.userId && other.planStatus === 'ACTIVE' && other.startDate === plan.startDate)
      .forEach((other) => (other.planStatus = 'ARCHIVED'));
    plan.planStatus = 'ACTIVE';
    return ok({ planId: plan.planId, planStatus: plan.planStatus }, 'Đã kích hoạt thực đơn.');
  }),

  // PUT /meal-plans/{id}/slots/{slotId} — FN-MEAL-03 Đổi món
  http.put(api('/meal-plans/:id/slots/:slotId'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const plan = findOwnPlan(params.id, me.userId);
    const slot = plan?.slots.find((item) => item.slotId === Number(params.slotId));
    if (!plan || !slot) return planNotFound();
    if (plan.planStatus === 'ARCHIVED' || plan.planStatus === 'TEMPLATE') {
      return fail(409, 'ERR_MEAL_PLAN_NOT_ACTIVE', 'Thực đơn đã lưu trữ nên không đổi món được.');
    }
    const body = await readJson(request);
    const excluded = body.excludedRecipeIds ?? [];
    if (body.swapReason !== undefined && !['TASTE_PREFERENCE', 'MISSING_INGREDIENT', 'TIME_LIMIT'].includes(String(body.swapReason))) {
      return validationError([{ field: 'swapReason', message: 'Lý do đổi món không hợp lệ.' }]);
    }
    if (!Array.isArray(excluded) || excluded.some((value) => !Number.isInteger(value))) {
      return validationError([{ field: 'excludedRecipeIds', message: 'Danh sách món loại trừ không hợp lệ.' }]);
    }
    const isDraft = plan.planStatus === 'DRAFT';
    const used = isDraft ? plan.preDeployUsed : plan.postDeployUsed;
    if (used >= EDIT_LIMIT) {
      return fail(403, 'ERR_QUOTA_MEAL_SWAP_EXCEEDED', `Bạn đã dùng hết ${EDIT_LIMIT} lần ${isDraft ? 'chỉnh sửa' : 'đổi món'} của thực đơn này.`);
    }
    const current = recipeById(slot.recipeId);
    const substitute = RECIPES.filter(
      (recipe) =>
        recipe.mealType === current.mealType &&
        recipe.recipeId !== current.recipeId &&
        !(excluded as number[]).includes(recipe.recipeId) &&
        Math.abs(recipe.kcal - current.kcal) <= current.kcal * 0.15
    ).sort((a, b) => Math.abs(a.kcal - current.kcal) - Math.abs(b.kcal - current.kcal))[0];
    if (!substitute) {
      return fail(422, 'ERR_MEAL_NO_SUBSTITUTE', 'Không còn món thay thế phù hợp (cùng trường phái, không dị ứng, chênh calo tối đa 15%).');
    }
    slot.recipeId = substitute.recipeId;
    if (isDraft) plan.preDeployUsed += 1;
    else plan.postDeployUsed += 1;
    return ok({ slot: slotDto(slot), swapsRemaining: EDIT_LIMIT - used - 1 }, 'Đã đổi món.');
  }),

  // PATCH /meal-plans/{id}/slots/{slotId} — FN-MEAL-04 Đánh dấu đã ăn
  http.patch(api('/meal-plans/:id/slots/:slotId'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const plan = findOwnPlan(params.id, me.userId);
    const slot = plan?.slots.find((item) => item.slotId === Number(params.slotId));
    if (!plan || !slot) return planNotFound();
    const body = await readJson(request);
    if (typeof body.isCompleted !== 'boolean') return validationError([{ field: 'isCompleted', message: 'Thiếu trạng thái đã ăn.' }]);
    if (plan.planStatus !== 'ACTIVE') return fail(409, 'ERR_MEAL_PLAN_NOT_ACTIVE', 'Thực đơn chưa kích hoạt nên chưa đánh dấu được.');
    slot.isCompleted = body.isCompleted;
    return ok({
      slotId: slot.slotId,
      isCompleted: slot.isCompleted,
      completed: plan.slots.filter((item) => item.isCompleted).length,
      total: plan.slots.length,
    });
  }),

  // GET /meal-plans/{id}/nutrition — FN-MEAL-07 (DETAILED chỉ VIP)
  http.get(api('/meal-plans/:id/nutrition'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const plan = findOwnPlan(params.id, me.userId);
    if (!plan) return planNotFound();
    const level = new URL(request.url).searchParams.get('level') ?? 'BASIC';
    if (level !== 'BASIC' && level !== 'DETAILED') return validationError([{ field: 'level', message: 'level là BASIC hoặc DETAILED.' }]);
    if (level === 'DETAILED' && !me.isVip) {
      return fail(403, 'ERR_VIP_REQUIRED', 'Xem calo chi tiết là tính năng dành cho thành viên VIP.');
    }
    const detailed = level === 'DETAILED';
    const days = DAYS.map((dayOfWeek) => {
      const slots = plan.slots.filter((slot) => slot.dayOfWeek === dayOfWeek);
      const kcal = slots.reduce((sum, slot) => sum + recipeById(slot.recipeId).kcal, 0);
      return {
        dayOfWeek,
        kcal,
        deltaKcal: detailed ? kcal - plan.targetDailyKcal : null,
        meals: detailed
          ? slots.map((slot) => ({ mealType: slot.mealType, recipeId: slot.recipeId, title: recipeById(slot.recipeId).title, kcal: recipeById(slot.recipeId).kcal }))
          : null,
      };
    });
    return ok({
      planId: plan.planId,
      level,
      targetKcalPerDay: detailed ? plan.targetDailyKcal : null,
      totalKcalWeek: detailed ? days.reduce((sum, day) => sum + day.kcal, 0) : null,
      days,
    });
  }),

  // GET /meal-plans/{id}/export — FN-MEAL-08 (VIP)
  http.get(api('/meal-plans/:id/export'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    if (!me.isVip) return fail(403, 'ERR_VIP_REQUIRED', 'Xuất PDF là tính năng dành cho thành viên VIP.');
    const plan = findOwnPlan(params.id, me.userId);
    if (!plan) return planNotFound();
    const include = new URL(request.url).searchParams.get('include') ?? 'PLAN,SHOPPING';
    if (include.includes('SHOPPING') && !shoppingLists.some((list) => list.planId === plan.planId)) {
      return fail(409, 'ERR_SHOPPING_LIST_NOT_FOUND', 'Thực đơn chưa có danh sách đi chợ.');
    }
    return new HttpResponse(new Blob([SAMPLE_PDF], { type: 'application/pdf' }), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=veggielife-meal-plan-${plan.planId}.pdf`,
      },
    });
  }),

  // POST /meal-plans/{id}/shopping-list — FN-MEAL-05
  http.post(api('/meal-plans/:id/shopping-list'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const plan = findOwnPlan(params.id, me.userId);
    if (!plan) return planNotFound();
    const body = await readJson(request);
    const multiplier = body.servingsMultiplier === undefined ? 1 : Number(body.servingsMultiplier);
    const details: { field: string; message: string }[] = [];
    if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 10) {
      details.push({ field: 'servingsMultiplier', message: 'Hệ số khẩu phần từ 1 đến 10.' });
    }
    if (body.targetShoppingDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.targetShoppingDate))) {
      details.push({ field: 'targetShoppingDate', message: 'Ngày đi chợ phải có dạng YYYY-MM-DD.' });
    }
    if (details.length) return validationError(details);
    if (plan.planStatus !== 'ACTIVE') return fail(409, 'ERR_MEAL_PLAN_NOT_ACTIVE', 'Cần kích hoạt thực đơn trước khi tạo danh sách đi chợ.');
    if (shoppingLists.some((list) => list.planId === plan.planId)) {
      return fail(409, 'ERR_SHOPPING_LIST_EXISTS', 'Thực đơn này đã có danh sách đi chợ.');
    }

    // Cộng dồn nguyên liệu của 21 bữa theo Ingredient_ID, nhân hệ số khẩu phần.
    const totals = new Map<number, number>();
    for (const slot of plan.slots) {
      for (const [ingredientId, quantity] of recipeById(slot.recipeId).ingredients) {
        totals.set(ingredientId, (totals.get(ingredientId) ?? 0) + quantity * multiplier);
      }
    }
    const list: MockShoppingList = {
      listId: ids.list++,
      planId: plan.planId,
      status: 'PENDING',
      items: [...totals.entries()]
        .map(([ingredientId, quantity]) => ({
          itemId: ids.item++,
          ingredientId,
          name: INGREDIENTS[ingredientId].name,
          quantity: Math.round(quantity),
          unit: INGREDIENTS[ingredientId].unit,
          aisle: INGREDIENTS[ingredientId].aisle,
          isPurchased: false,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    };
    shoppingLists.push(list);
    const { progress: _progress, ...created } = listDto(list);
    return ok(created, 'Đã tạo danh sách đi chợ.', 201);
  }),

  // GET /shopping-lists/{id} — FN-MEAL-06
  http.get(api('/shopping-lists/:id'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const list = shoppingLists.find((item) => item.listId === Number(params.id));
    if (!list || !findOwnPlan(list.planId, me.userId)) return planNotFound();
    const { planId: _planId, ...dto } = listDto(list);
    return ok(dto);
  }),

  // PATCH /shopping-lists/{id}/items/{itemId} — FN-MEAL-06
  http.patch(api('/shopping-lists/:id/items/:itemId'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const list = shoppingLists.find((item) => item.listId === Number(params.id));
    if (!list || !findOwnPlan(list.planId, me.userId)) return planNotFound();
    const item = list.items.find((entry) => entry.itemId === Number(params.itemId));
    if (!item) return planNotFound();
    const body = await readJson(request);
    if (typeof body.isPurchased !== 'boolean') return validationError([{ field: 'isPurchased', message: 'Thiếu trạng thái đã mua.' }]);
    item.isPurchased = body.isPurchased;
    if (list.status === 'PENDING' && list.items.every((entry) => entry.isPurchased)) list.status = 'COMPLETED';
    return ok({ itemId: item.itemId, isPurchased: item.isPurchased, listStatus: list.status });
  }),

  // PATCH /shopping-lists/{id} — FN-MEAL-06 Hoàn tất / hủy
  http.patch(api('/shopping-lists/:id'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const list = shoppingLists.find((item) => item.listId === Number(params.id));
    if (!list || !findOwnPlan(list.planId, me.userId)) return planNotFound();
    const body = await readJson(request);
    if (body.status !== 'COMPLETED' && body.status !== 'CANCELLED') {
      return validationError([{ field: 'status', message: 'Trạng thái là COMPLETED hoặc CANCELLED.' }]);
    }
    list.status = body.status;
    return ok({ listId: list.listId, status: list.status }, body.status === 'COMPLETED' ? 'Đã hoàn tất danh sách.' : 'Đã hủy danh sách.');
  }),
];
