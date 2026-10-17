import { http } from 'msw';
import { comments, lastCommentAt, nextId, posts, type MockComment } from '../db';
import {
  allergens,
  categories,
  dietarySchools,
  findIngredient,
  findSchool,
  ingredients,
  nextRecipeId,
  recipes,
  recipeVotes,
  type MockRecipe,
} from '../recipeDb';
import { api, currentUser, fail, isFlaggedByAi, isPositiveInt, latency, ok, unauthorized, validationError } from '../utils';
import { isVisibleComment, toCommentDto } from './community.handlers';

// Mô phỏng FN-POST-01..04, FN-POST-11, FN-COMM-01/02/04 cho công thức và FN-PROF-08 (docs/09. Task Cards).
// UNSPECIFIED (giả định 17/10/2026, chờ Leader chốt):
//   GET /recipes?authorId=<người gọi>&status= trả mọi trạng thái trừ DELETED, mỗi mục kèm status (SCR-14);
//   GET /recipes/{id} cho tác giả xem bản chưa duyệt, kèm authorId, status, categoryId, dietarySchoolId, difficultyLevel, isOptional.
// Thử trạng thái lỗi khi dev:
//   GET /recipes keyword "#loi-he-thong" → 500, "#redis-down" → 503; GET /recipes/5000 → 500.
//   Gửi duyệt có tên món chứa "#ai-down" → 503 ERR_AI_CIRCUIT_OPEN; chứa "thịt bò"/"thịt heo" → 422 ERR_CONTENT_VIOLATION_VEGAN.
//   Nguyên liệu bị cấm theo trường phái (trứng với Thuần chay, hành tỏi với Kiêng ngũ vị tân…) → 422 ERR_RECIPE_RED_ALERT.

const notFound = () => fail(404, 'ERR_CONTENT_NOT_FOUND', 'Nội dung không tồn tại hoặc chưa ở trạng thái hiển thị.');
const notOwner = () => fail(403, 'ERR_CONTENT_NOT_OWNER', 'Bạn không phải tác giả của nội dung này.');

/** So khớp không phân biệt dấu (giống collation CI_AI của SQL Server). */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const schoolCode = (recipe: MockRecipe) => findSchool(recipe.dietarySchoolId)?.schoolCode ?? 'VEGAN';
const ingredientNames = (recipe: MockRecipe) => recipe.ingredients.map((line) => findIngredient(line.ingredientId)?.name ?? '');
const voteCount = (recipe: MockRecipe) =>
  recipe.baseVotes + [...recipeVotes].filter((key) => key.endsWith(`:${recipe.recipeId}`)).length;
const commentCount = (recipeId: number) => comments.filter((c) => c.recipeId === recipeId && isVisibleComment(c)).length;
const findRecipe = (id: unknown) => recipes.find((recipe) => recipe.recipeId === Number(id));
const isPublic = (recipe: MockRecipe | undefined): recipe is MockRecipe => recipe?.status === 'APPROVED_ACTIVE';

const toListItem = (recipe: MockRecipe) => ({
  recipeId: recipe.recipeId,
  type: recipe.type,
  title: recipe.title,
  imageUrl: recipe.imageUrl,
  dietarySchool: schoolCode(recipe),
  cookTimeMinutes: recipe.cookTimeMinutes,
  caloriesKcal: recipe.caloriesKcal,
  voteCount: voteCount(recipe),
  isVerified: recipe.isVerified,
});

/** Calories_Kcal dẫn xuất từ nguyên liệu × Calories_Per_100g (chỉ tính đơn vị khối lượng/thể tích). */
const GRAMS: Record<string, number> = { g: 1, gram: 1, gam: 1, kg: 1000, ml: 1, l: 1000, 'lít': 1000 };
const computeCalories = (lines: MockRecipe['ingredients']) =>
  Math.round(
    lines.reduce((sum, line) => {
      const grams = GRAMS[line.unit.toLowerCase()];
      const ingredient = findIngredient(line.ingredientId);
      return grams && ingredient ? sum + (line.quantity * grams * ingredient.caloriesPer100g) / 100 : sum;
    }, 0)
  );

type RecipeBody = Partial<{
  title: unknown;
  categoryId: unknown;
  dietarySchoolId: unknown;
  description: unknown;
  instructions: unknown;
  prepTimeMinutes: unknown;
  cookTimeMinutes: unknown;
  servings: unknown;
  difficultyLevel: unknown;
  ingredients: unknown;
  submit: unknown;
}>;

type Detail = { field: string; message: string };

/** Kiểm tra kiểu và khoảng giá trị (400); `partial` = PUT chỉ kiểm tra field có gửi. */
function validateRecipeBody(body: RecipeBody, partial: boolean): Detail[] {
  const details: Detail[] = [];
  const has = (key: keyof RecipeBody) => !partial || body[key] !== undefined;
  if (has('title')) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 10 || title.length > 100) details.push({ field: 'title', message: 'Tên món cần 10–100 ký tự.' });
  }
  if (has('categoryId') && !categories.some((c) => c.categoryId === body.categoryId))
    details.push({ field: 'categoryId', message: 'Danh mục không hợp lệ.' });
  if (has('dietarySchoolId') && !findSchool(Number(body.dietarySchoolId)))
    details.push({ field: 'dietarySchoolId', message: 'Trường phái không hợp lệ.' });
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 1000))
    details.push({ field: 'description', message: 'Mô tả tối đa 1000 ký tự.' });
  if (has('instructions') && !(Array.isArray(body.instructions) && body.instructions.every((s) => typeof s === 'string')))
    details.push({ field: 'instructions', message: 'Các bước phải là danh sách chữ.' });
  if (body.prepTimeMinutes !== undefined && !(Number.isInteger(body.prepTimeMinutes) && (body.prepTimeMinutes as number) >= 0))
    details.push({ field: 'prepTimeMinutes', message: 'Thời gian chuẩn bị ≥ 0.' });
  if (has('cookTimeMinutes') && !isPositiveInt(body.cookTimeMinutes))
    details.push({ field: 'cookTimeMinutes', message: 'Thời gian nấu phải > 0.' });
  if (body.servings !== undefined && !isPositiveInt(body.servings)) details.push({ field: 'servings', message: 'Khẩu phần ≥ 1.' });
  if (body.difficultyLevel !== undefined && !['EASY', 'MEDIUM', 'HARD'].includes(body.difficultyLevel as string))
    details.push({ field: 'difficultyLevel', message: 'Độ khó không hợp lệ.' });
  if (has('ingredients')) {
    const lines = Array.isArray(body.ingredients) ? body.ingredients : null;
    const valid = lines?.every(
      (line) =>
        line &&
        typeof line === 'object' &&
        findIngredient(Number((line as { ingredientId?: unknown }).ingredientId)) &&
        isPositiveInt((line as { quantity?: unknown }).quantity) &&
        typeof (line as { unit?: unknown }).unit === 'string' &&
        ((line as { unit: string }).unit.trim().length > 0)
    );
    if (!valid) details.push({ field: 'ingredients', message: 'Mỗi nguyên liệu cần mã, định lượng > 0 và đơn vị.' });
  }
  return details;
}

/**
 * Kiểm duyệt khi gửi (FN-POST-03): cấu trúc BR-USR-05 → Red Alert theo trường phái (D109) → AI (BR-ADM-CNT-002).
 * Trả về lỗi 422/503 hoặc trạng thái sau kiểm duyệt.
 */
function moderate(recipe: MockRecipe) {
  if (recipe.title.includes('#ai-down')) {
    return { error: fail(503, 'ERR_AI_CIRCUIT_OPEN', 'Hệ thống kiểm duyệt AI đang tạm ngắt, chưa ghi thay đổi. Vui lòng thử lại sau.') };
  }
  if (recipe.instructions.length < 2 || recipe.ingredients.length === 0 || recipe.cookTimeMinutes <= 0) {
    return { error: fail(422, 'ERR_RECIPE_STRUCTURE_INVALID', 'Công thức cần ít nhất 1 nguyên liệu có định lượng, 2 bước và thời gian nấu > 0.') };
  }
  const text = `${recipe.title} ${recipe.description ?? ''} ${recipe.instructions.join(' ')}`.toLowerCase();
  if (['thịt bò', 'thịt heo', 'thịt lợn'].some((word) => text.includes(word))) {
    recipe.status = 'QUARANTINED_HIDDEN';
    return { error: fail(422, 'ERR_CONTENT_VIOLATION_VEGAN', 'Công thức có thịt đỏ nên không được đăng; nội dung đã được chuyển cho quản trị viên.') };
  }
  const school = findSchool(recipe.dietarySchoolId)!;
  const banned = recipe.ingredients
    .map((line) => findIngredient(line.ingredientId)!)
    .find((item) => (school.forbiddenFoodGroups as readonly string[]).includes(item.foodGroup) || (school.forbidAllium && item.isAllium));
  if (banned) {
    recipe.status = 'QUARANTINED_HIDDEN';
    return {
      error: fail(422, 'ERR_RECIPE_RED_ALERT', `“${banned.name}” không phù hợp trường phái ${school.schoolName}. Công thức đã bị gỡ và chờ quản trị viên xem xét.`),
    };
  }
  const flagged = isFlaggedByAi(text);
  return { status: flagged ? ('QUARANTINED_HIDDEN' as const) : ('APPROVED_ACTIVE' as const), aiConfidence: flagged ? 0.91 : 0.08 };
}

/** BR-USR-04: tài khoản < 3 ngày tối đa 2 bài/ngày, còn lại 10 bài/ngày (công thức + bài viết, không tính nháp). */
function overDailyLimit(user: { userId: number; createdAt: string }) {
  const today = new Date().toDateString();
  const isToday = (iso: string) => new Date(iso).toDateString() === today;
  const count =
    recipes.filter((r) => r.authorId === user.userId && r.status !== 'DRAFT' && isToday(r.createdAt)).length +
    posts.filter((p) => p.authorId === user.userId && p.status !== 'DRAFT' && isToday(p.createdAt)).length;
  const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / 86_400_000;
  return count >= (ageDays < 3 ? 2 : 10);
}

const applyBody = (recipe: MockRecipe, body: RecipeBody) => {
  if (typeof body.title === 'string') recipe.title = body.title.trim();
  if (body.categoryId !== undefined) recipe.categoryId = Number(body.categoryId);
  if (body.dietarySchoolId !== undefined) recipe.dietarySchoolId = Number(body.dietarySchoolId);
  if (body.description !== undefined) recipe.description = String(body.description).trim() || null;
  if (Array.isArray(body.instructions)) recipe.instructions = (body.instructions as string[]).map((s) => s.trim()).filter(Boolean);
  if (body.prepTimeMinutes !== undefined) recipe.prepTimeMinutes = Number(body.prepTimeMinutes);
  if (body.cookTimeMinutes !== undefined) recipe.cookTimeMinutes = Number(body.cookTimeMinutes);
  if (body.servings !== undefined) recipe.servings = Number(body.servings);
  if (body.difficultyLevel !== undefined) recipe.difficultyLevel = body.difficultyLevel as MockRecipe['difficultyLevel'];
  if (Array.isArray(body.ingredients)) {
    recipe.ingredients = (body.ingredients as { ingredientId: number; quantity: number; unit: string; isOptional?: boolean }[]).map((line) => ({
      ingredientId: Number(line.ingredientId),
      quantity: Number(line.quantity),
      unit: line.unit.trim(),
      isOptional: line.isOptional === true,
    }));
    recipe.caloriesKcal = computeCalories(recipe.ingredients);
  }
};

/** Trạng thái lọc được ở Công thức của tôi (không có DELETED). */
const OWN_STATUSES: MockRecipe['status'][] = ['DRAFT', 'PENDING_REVIEW', 'APPROVED_ACTIVE', 'REJECTED', 'QUARANTINED_HIDDEN', 'ARCHIVED'];

const savedMessage = (status: MockRecipe['status']) =>
  status === 'DRAFT' ? 'Đã lưu nháp.' : status === 'APPROVED_ACTIVE' ? 'Đã đăng công thức.' : 'Công thức đang chờ quản trị viên duyệt.';

export const recipesHandlers = [
  // FN-PROF-08 — danh mục dùng chung
  http.get(api('/dietary-schools'), async () => {
    await latency();
    return ok(dietarySchools);
  }),
  http.get(api('/categories'), async () => {
    await latency();
    return ok(categories);
  }),
  http.get(api('/allergens'), async () => {
    await latency();
    return ok(allergens);
  }),
  http.get(api('/ingredients'), async ({ request }) => {
    await latency();
    const q = new URL(request.url).searchParams;
    const keyword = q.get('keyword')?.trim() ?? '';
    const page = Number(q.get('page') ?? 1);
    const size = Number(q.get('size') ?? 20);
    if (keyword.length > 100 || !isPositiveInt(page) || !isPositiveInt(size) || size > 50) {
      return validationError([{ field: 'keyword', message: 'keyword ≤ 100 ký tự, page ≥ 1, size 1–50.' }]);
    }
    const list = keyword ? ingredients.filter((item) => fold(item.name).includes(fold(keyword))) : ingredients;
    return ok(list.slice((page - 1) * size, page * size), 'OK', 200, { page, size, total: list.length });
  }),

  // GET /recipes — FN-POST-01
  http.get(api('/recipes'), async ({ request }) => {
    await latency();
    const q = new URL(request.url).searchParams;
    const keyword = q.get('keyword')?.trim() ?? '';
    const ingredient = q.get('ingredient')?.trim() ?? '';
    const schoolId = q.get('dietarySchoolId');
    const categoryId = q.get('categoryId');
    const maxCookTime = q.get('maxCookTime');
    const contentType = q.get('contentType') ?? 'ALL';
    const sort = q.get('sort') ?? 'POPULAR';
    const page = Number(q.get('page') ?? 1);
    const size = Number(q.get('size') ?? 10);
    const authorId = q.get('authorId');
    const status = q.get('status');
    const me = currentUser(request);
    const ownList = me !== null && authorId !== null && Number(authorId) === me.userId;

    if (keyword === '#loi-he-thong') return fail(500, 'ERR_SYS_DATABASE_UNAVAILABLE', 'Không kết nối được cơ sở dữ liệu.');
    if (keyword === '#redis-down') return fail(503, 'ERR_SYS_REDIS_UNAVAILABLE', 'Dịch vụ tạm gián đoạn, vui lòng thử lại sau.');

    const details: Detail[] = [];
    if (keyword.length > 100) details.push({ field: 'keyword', message: 'Từ khóa tối đa 100 ký tự.' });
    if (ingredient.length > 50) details.push({ field: 'ingredient', message: 'Nguyên liệu tối đa 50 ký tự.' });
    if (schoolId !== null && !findSchool(Number(schoolId))) details.push({ field: 'dietarySchoolId', message: 'Trường phái không hợp lệ.' });
    if (categoryId !== null && !isPositiveInt(Number(categoryId))) details.push({ field: 'categoryId', message: 'categoryId phải > 0.' });
    if (maxCookTime !== null && !(isPositiveInt(Number(maxCookTime)) && Number(maxCookTime) <= 600))
      details.push({ field: 'maxCookTime', message: 'maxCookTime trong khoảng 1–600 phút.' });
    if (!['ALL', 'RECIPE', 'VIDEO'].includes(contentType)) details.push({ field: 'contentType', message: 'contentType không hợp lệ.' });
    if (!['POPULAR', 'NEWEST'].includes(sort)) details.push({ field: 'sort', message: 'sort không hợp lệ.' });
    if (!isPositiveInt(page)) details.push({ field: 'page', message: 'page phải ≥ 1.' });
    if (!isPositiveInt(size) || size > 20) details.push({ field: 'size', message: 'size trong khoảng 1–20.' });
    if (authorId !== null && !isPositiveInt(Number(authorId))) details.push({ field: 'authorId', message: 'authorId phải > 0.' });
    if (status !== null && !OWN_STATUSES.includes(status as MockRecipe['status']))
      details.push({ field: 'status', message: 'status không hợp lệ.' });
    if (details.length) return validationError(details);

    let list = ownList
      ? recipes.filter((recipe) => recipe.authorId === me.userId && recipe.status !== 'DELETED')
      : recipes.filter((recipe) => recipe.status === 'APPROVED_ACTIVE');
    if (authorId !== null) list = list.filter((r) => r.authorId === Number(authorId));
    if (status !== null) list = list.filter((r) => r.status === status);
    if (keyword) {
      const k = fold(keyword);
      list = list.filter((r) => fold(`${r.title} ${ingredientNames(r).join(' ')}`).includes(k));
    }
    if (ingredient) list = list.filter((r) => ingredientNames(r).some((name) => fold(name).includes(fold(ingredient))));
    if (schoolId !== null) list = list.filter((r) => r.dietarySchoolId === Number(schoolId));
    if (categoryId !== null) list = list.filter((r) => r.categoryId === Number(categoryId));
    if (maxCookTime !== null) list = list.filter((r) => r.cookTimeMinutes <= Number(maxCookTime));
    if (contentType !== 'ALL') list = list.filter((r) => r.type === contentType);
    list.sort((a, b) => (sort === 'NEWEST' ? b.createdAt.localeCompare(a.createdAt) : voteCount(b) - voteCount(a)));

    const meta = {
      page,
      size,
      total: list.length,
      // BR-GUEST-01: chỉ Khách nhận vị trí mời đăng ký.
      ...(me ? {} : { signUpPromptAtItem: 5 }),
    };
    const items = list.slice((page - 1) * size, page * size).map((r) => (ownList ? { ...toListItem(r), status: r.status } : toListItem(r)));
    return ok(items, 'OK', 200, meta);
  }),

  // GET /recipes/{id} — FN-POST-02 (chỉ APPROVED_ACTIVE)
  http.get(api('/recipes/:id'), async ({ request, params }) => {
    await latency();
    if (params.id === '5000') return fail(500, 'ERR_SYS_DATABASE_UNAVAILABLE', 'Không kết nối được cơ sở dữ liệu.');
    if (!isPositiveInt(Number(params.id))) return validationError([{ field: 'id', message: 'id phải > 0.' }]);
    const recipe = findRecipe(params.id);
    const me = currentUser(request);
    const ownDraft = recipe !== undefined && me?.userId === recipe.authorId && recipe.status !== 'DELETED';
    if (!recipe || (!isPublic(recipe) && !ownDraft)) return notFound();
    const member = me !== null && isPublic(recipe);
    return ok({
      ...toListItem(recipe),
      authorId: recipe.authorId,
      status: recipe.status,
      categoryId: recipe.categoryId,
      dietarySchoolId: recipe.dietarySchoolId,
      difficultyLevel: recipe.difficultyLevel,
      description: recipe.description,
      servings: recipe.servings,
      prepTimeMinutes: recipe.prepTimeMinutes,
      instructions: recipe.instructions,
      ingredients: recipe.ingredients.map((line) => ({
        ingredientId: line.ingredientId,
        name: findIngredient(line.ingredientId)?.name ?? '',
        quantity: line.quantity,
        unit: line.unit,
        isOptional: line.isOptional,
      })),
      hasTranscript: recipe.hasTranscript,
      commentCount: commentCount(recipe.recipeId),
      memberActions: { canVote: member, canComment: member, canReport: member },
    });
  }),

  // GET /recipes/{id}/related — FN-POST-11
  http.get(api('/recipes/:id/related'), async ({ request, params }) => {
    await latency();
    const recipe = findRecipe(params.id);
    if (!isPublic(recipe)) return notFound();
    const limit = Number(new URL(request.url).searchParams.get('limit') ?? 6);
    if (!isPositiveInt(limit) || limit > 10) return validationError([{ field: 'limit', message: 'limit trong khoảng 1–10.' }]);
    const mine = new Set(recipe.ingredients.map((line) => line.ingredientId));
    const score = (other: MockRecipe) =>
      (other.dietarySchoolId === recipe.dietarySchoolId ? 2 : 0) + other.ingredients.filter((line) => mine.has(line.ingredientId)).length;
    const related = recipes
      .filter((other) => other.recipeId !== recipe.recipeId && other.status === 'APPROVED_ACTIVE' && score(other) > 0)
      .sort((a, b) => score(b) - score(a) || voteCount(b) - voteCount(a))
      .slice(0, limit);
    return ok({ recipes: related.map(toListItem), posts: [], videos: [] });
  }),

  // POST /recipes — FN-POST-03
  http.post(api('/recipes'), async ({ request }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const body = (await request.json()) as RecipeBody;
    const details = validateRecipeBody(body, false);
    if (details.length) return validationError(details);
    const submit = body.submit === true;
    if (submit && overDailyLimit(me)) return fail(429, 'ERR_POST_DAILY_LIMIT_EXCEEDED', 'Bạn đã đạt giới hạn số bài đăng trong ngày.');

    const recipe: MockRecipe = {
      recipeId: nextRecipeId(),
      authorId: me.userId,
      type: 'RECIPE',
      title: '',
      description: null,
      imageUrl: null,
      categoryId: 0,
      dietarySchoolId: 0,
      difficultyLevel: null,
      servings: null,
      prepTimeMinutes: null,
      cookTimeMinutes: 0,
      instructions: [],
      ingredients: [],
      status: 'DRAFT',
      isVerified: false,
      baseVotes: 0,
      caloriesKcal: 0,
      hasTranscript: false,
      createdAt: new Date().toISOString(),
    };
    applyBody(recipe, body);

    let aiConfidence = 0;
    if (submit) {
      const result = moderate(recipe);
      if ('error' in result) {
        // Red Alert / thịt đỏ: vẫn lưu ở QUARANTINED_HIDDEN chờ Admin (FN-POST-03).
        if (recipe.status === 'QUARANTINED_HIDDEN') recipes.unshift(recipe);
        return result.error;
      }
      recipe.status = result.status;
      aiConfidence = result.aiConfidence;
    }
    recipes.unshift(recipe);
    return ok({ recipeId: recipe.recipeId, status: recipe.status, aiConfidence }, savedMessage(recipe.status), 201);
  }),

  // PUT /recipes/{id} — FN-POST-04 (sửa nháp, gửi duyệt bản nháp, sửa bản đã đăng thì kiểm duyệt lại)
  http.put(api('/recipes/:id'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const recipe = findRecipe(params.id);
    if (!recipe || recipe.status === 'DELETED' || recipe.status === 'ARCHIVED') return notFound();
    if (recipe.authorId !== me.userId) return notOwner();
    if (recipe.status === 'QUARANTINED_HIDDEN') {
      return fail(409, 'ERR_RECIPE_LOCKED', 'Công thức đang chờ quản trị viên xem xét nên chưa sửa được.');
    }
    const body = (await request.json()) as RecipeBody;
    const details = validateRecipeBody(body, true);
    if (details.length) return validationError(details);

    const draft = recipe.status === 'DRAFT' || recipe.status === 'REJECTED';
    const submit = draft ? body.submit === true : true;
    if (draft && submit && overDailyLimit(me)) {
      return fail(429, 'ERR_POST_DAILY_LIMIT_EXCEEDED', 'Bạn đã đạt giới hạn số bài đăng trong ngày.');
    }
    const next = { ...recipe, ingredients: [...recipe.ingredients], instructions: [...recipe.instructions] };
    applyBody(next, body);
    if (submit) {
      const result = moderate(next);
      if ('error' in result) {
        if (next.status === 'QUARANTINED_HIDDEN') Object.assign(recipe, next);
        return result.error;
      }
      next.status = result.status;
    }
    Object.assign(recipe, next);
    return ok({ recipeId: recipe.recipeId, status: recipe.status, moderated: submit }, savedMessage(recipe.status));
  }),

  // GET /recipes/{id}/comments — FN-COMM-01
  http.get(api('/recipes/:id/comments'), async ({ request, params }) => {
    await latency();
    const recipe = findRecipe(params.id);
    if (!isPublic(recipe)) return notFound();
    const q = new URL(request.url).searchParams;
    const page = Number(q.get('page') ?? 1);
    const size = Number(q.get('size') ?? 20);
    if (!isPositiveInt(page) || !isPositiveInt(size) || size > 50) {
      return validationError([{ field: 'size', message: 'page ≥ 1, size trong khoảng 1–50.' }]);
    }
    const roots = comments
      .filter((c) => c.recipeId === recipe.recipeId && c.parentCommentId === null && isVisibleComment(c))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return ok(roots.slice((page - 1) * size, page * size).map((c) => toCommentDto(c)), 'OK', 200, { page, size, total: roots.length });
  }),

  // POST /recipes/{id}/comments — FN-COMM-02 (giãn cách 15 giây, BR-USR-04)
  http.post(api('/recipes/:id/comments'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const recipe = findRecipe(params.id);
    if (!isPublic(recipe)) return notFound();
    const body = (await request.json()) as { content?: string; parentCommentId?: number };
    const content = body.content?.trim() ?? '';
    if (content.length < 2 || content.length > 500) return validationError([{ field: 'content', message: 'Bình luận cần 2–500 ký tự.' }]);
    if (body.parentCommentId !== undefined) {
      const parent = comments.find((c) => c.commentId === body.parentCommentId);
      if (!parent || parent.recipeId !== recipe.recipeId || !isVisibleComment(parent)) {
        return validationError([{ field: 'parentCommentId', message: 'Bình luận cha không thuộc công thức này.' }]);
      }
    }
    const last = lastCommentAt.get(me.userId);
    if (last && Date.now() - last < 15_000) return fail(429, 'ERR_COMMENT_TOO_FAST', 'Vui lòng chờ 15 giây giữa 2 bình luận.');

    const comment: MockComment = {
      commentId: nextId('comment'),
      recipeId: recipe.recipeId,
      authorId: me.userId,
      parentCommentId: body.parentCommentId ?? null,
      content,
      status: isFlaggedByAi(content) ? 'QUARANTINED_HIDDEN' : 'ACTIVE',
      isSoftDeleted: false,
      createdAt: new Date().toISOString(),
    };
    comments.push(comment);
    lastCommentAt.set(me.userId, Date.now());
    return ok(toCommentDto(comment, false), 'Đã bình luận.', 201);
  }),

  // DELETE /recipes/{id}?mode= — FN-POST-04: archive (chỉ bản đang công khai) = gỡ khỏi trang cá nhân; all = xóa mềm
  http.delete(api('/recipes/:id'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const mode = new URL(request.url).searchParams.get('mode');
    if (mode !== 'archive' && mode !== 'all') return validationError([{ field: 'mode', message: 'mode là archive hoặc all.' }]);
    const recipe = findRecipe(params.id);
    if (!recipe || recipe.status === 'DELETED') return notFound();
    if (recipe.authorId !== me.userId) return notOwner();
    if (mode === 'archive' && recipe.status !== 'APPROVED_ACTIVE') return notFound();
    recipe.status = mode === 'archive' ? 'ARCHIVED' : 'DELETED';
    return ok(
      { recipeId: recipe.recipeId, status: recipe.status },
      mode === 'archive' ? 'Đã gỡ công thức khỏi trang cá nhân.' : 'Đã xóa công thức.'
    );
  }),

  // POST /recipes/{id}/votes — FN-COMM-04 (bấm lần hai là bỏ tim)
  http.post(api('/recipes/:id/votes'), async ({ request, params }) => {
    await latency();
    const me = currentUser(request);
    if (!me) return unauthorized();
    const recipe = findRecipe(params.id);
    if (!isPublic(recipe)) return notFound();
    const key = `${me.userId}:${recipe.recipeId}`;
    const voted = !recipeVotes.has(key);
    if (voted) recipeVotes.add(key);
    else recipeVotes.delete(key);
    return ok({ voted, voteCount: voteCount(recipe) });
  }),
];
