import { http } from 'msw';
import { api, currentUser, fail, isPositiveInt, latency, ok, validationError } from '../utils';

// Mô phỏng FN-POST-01 (GET /recipes) và FN-PROF-08 (GET /dietary-schools) cho trang chủ (SCR-10).
// Từ khóa đặc biệt để xem trạng thái lỗi khi dev: "#loi-he-thong" → 500, "#redis-down" → 503.

/** Seed 07 trường phái (DietarySchools, BR-ADM-MAS-001). */
const SCHOOLS = [
  { dietarySchoolId: 1, schoolCode: 'VEGAN', schoolName: 'Thuần chay', forbiddenFoodGroups: ['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 2, schoolCode: 'OVO', schoolName: 'Ăn chay có trứng', forbiddenFoodGroups: ['DAIRY', 'POULTRY', 'SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 3, schoolCode: 'LACTO', schoolName: 'Ăn chay có sữa', forbiddenFoodGroups: ['EGG', 'POULTRY', 'SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 4, schoolCode: 'LACTO_OVO', schoolName: 'Ăn chay có trứng và sữa', forbiddenFoodGroups: ['POULTRY', 'SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 5, schoolCode: 'BUDDHIST', schoolName: 'Chay kiêng ngũ vị tân', forbiddenFoodGroups: ['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'], forbidAllium: true },
  { dietarySchoolId: 6, schoolCode: 'POLLOTARIAN', schoolName: 'Chay ăn thịt trắng', forbiddenFoodGroups: ['SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 7, schoolCode: 'PESCATARIAN', schoolName: 'Chay ăn hải sản', forbiddenFoodGroups: ['POULTRY'], forbidAllium: false },
] as const;

type SchoolCode = (typeof SCHOOLS)[number]['schoolCode'];

interface MockRecipeItem {
  recipeId: number;
  type: 'RECIPE' | 'VIDEO';
  title: string;
  image: string | null;
  dietarySchool: SchoolCode;
  cookTimeMinutes: number;
  caloriesKcal: number;
  voteCount: number;
  isVerified: boolean;
  ingredients: string[];
  daysAgo: number;
}

/** Ảnh món lấy từ public/images (bộ ảnh mẫu của dự án). */
const img = (name: string) => `/images/${name}.jpg`;

const RECIPES: MockRecipeItem[] = [
  { recipeId: 512, type: 'RECIPE', title: 'Canh nấm đậu phụ rong biển', image: img('1872b5755f'), dietarySchool: 'VEGAN', cookTimeMinutes: 25, caloriesKcal: 310, voteCount: 42, isVerified: true, ingredients: ['đậu phụ', 'nấm', 'rong biển'], daysAgo: 1 },
  { recipeId: 513, type: 'VIDEO', title: 'Đậu hũ kho nấm niêu đất', image: img('09b8f62b58'), dietarySchool: 'VEGAN', cookTimeMinutes: 35, caloriesKcal: 380, voteCount: 128, isVerified: true, ingredients: ['đậu hũ', 'nấm hương', 'hạt sen'], daysAgo: 2 },
  { recipeId: 514, type: 'RECIPE', title: 'Gỏi cuốn rau củ chấm tương đậu', image: img('22f3765374'), dietarySchool: 'BUDDHIST', cookTimeMinutes: 20, caloriesKcal: 260, voteCount: 87, isVerified: true, ingredients: ['bánh tráng', 'bún', 'rau thơm', 'đậu phộng'], daysAgo: 3 },
  { recipeId: 515, type: 'RECIPE', title: 'Chả giò khoai môn', image: img('2931d9f03b'), dietarySchool: 'VEGAN', cookTimeMinutes: 45, caloriesKcal: 420, voteCount: 64, isVerified: false, ingredients: ['khoai môn', 'nấm mèo', 'cà rốt'], daysAgo: 4 },
  { recipeId: 516, type: 'RECIPE', title: 'Salad đậu hũ ngũ sắc', image: img('2b6936ec9e'), dietarySchool: 'VEGAN', cookTimeMinutes: 15, caloriesKcal: 290, voteCount: 51, isVerified: true, ingredients: ['đậu hũ', 'xà lách', 'cà chua', 'bắp cải tím'], daysAgo: 5 },
  { recipeId: 517, type: 'VIDEO', title: 'Phở chay nấm nước dùng rau củ', image: img('2c71727880'), dietarySchool: 'BUDDHIST', cookTimeMinutes: 60, caloriesKcal: 380, voteCount: 96, isVerified: true, ingredients: ['bánh phở', 'nấm', 'củ cải', 'hoa hồi'], daysAgo: 6 },
  { recipeId: 518, type: 'RECIPE', title: 'Đậu hũ non sốt cà chua', image: img('2edd6eeddf'), dietarySchool: 'VEGAN', cookTimeMinutes: 18, caloriesKcal: 240, voteCount: 39, isVerified: false, ingredients: ['đậu hũ non', 'cà chua', 'hành lá'], daysAgo: 7 },
  { recipeId: 519, type: 'RECIPE', title: 'Cơm gạo lứt rau củ áp chảo', image: img('2f0a1969da'), dietarySchool: 'LACTO_OVO', cookTimeMinutes: 30, caloriesKcal: 450, voteCount: 58, isVerified: true, ingredients: ['gạo lứt', 'trứng', 'đậu Hà Lan', 'cà rốt'], daysAgo: 8 },
  { recipeId: 520, type: 'RECIPE', title: 'Canh đậu hũ cà chua', image: img('31e841c9b1'), dietarySchool: 'VEGAN', cookTimeMinutes: 15, caloriesKcal: 180, voteCount: 33, isVerified: false, ingredients: ['đậu hũ', 'cà chua'], daysAgo: 9 },
  { recipeId: 521, type: 'VIDEO', title: 'Nem rán chay nhân nấm', image: img('ded969492e'), dietarySchool: 'VEGAN', cookTimeMinutes: 50, caloriesKcal: 360, voteCount: 72, isVerified: false, ingredients: ['bánh đa nem', 'nấm mèo', 'củ sắn'], daysAgo: 10 },
  { recipeId: 522, type: 'RECIPE', title: 'Đậu hũ sốt tương ớt', image: img('363d6ff0f6'), dietarySchool: 'VEGAN', cookTimeMinutes: 20, caloriesKcal: 270, voteCount: 45, isVerified: true, ingredients: ['đậu hũ', 'tương ớt', 'mè'], daysAgo: 11 },
  { recipeId: 523, type: 'RECIPE', title: 'Bún Huế chay', image: img('377125941e'), dietarySchool: 'VEGAN', cookTimeMinutes: 70, caloriesKcal: 500, voteCount: 81, isVerified: true, ingredients: ['bún', 'sả', 'nấm', 'chả chay'], daysAgo: 12 },
  { recipeId: 524, type: 'RECIPE', title: 'Canh bí xanh nấm rơm', image: img('384dd41e1c'), dietarySchool: 'BUDDHIST', cookTimeMinutes: 20, caloriesKcal: 150, voteCount: 27, isVerified: false, ingredients: ['bí xanh', 'nấm rơm'], daysAgo: 13 },
  { recipeId: 525, type: 'RECIPE', title: 'Rau mầm trộn mè rang', image: img('417f827b32'), dietarySchool: 'VEGAN', cookTimeMinutes: 10, caloriesKcal: 160, voteCount: 22, isVerified: false, ingredients: ['rau mầm', 'mè', 'chanh'], daysAgo: 14 },
  { recipeId: 526, type: 'RECIPE', title: 'Rau củ luộc chấm kho quẹt chay', image: img('55e020cc9c'), dietarySchool: 'VEGAN', cookTimeMinutes: 25, caloriesKcal: 230, voteCount: 48, isVerified: true, ingredients: ['bông cải', 'cà rốt', 'đậu bắp', 'nước tương'], daysAgo: 15 },
  { recipeId: 527, type: 'RECIPE', title: 'Đậu hũ kho tiêu', image: img('605416fa38'), dietarySchool: 'VEGAN', cookTimeMinutes: 30, caloriesKcal: 320, voteCount: 66, isVerified: true, ingredients: ['đậu hũ', 'tiêu', 'nước tương'], daysAgo: 16 },
  { recipeId: 528, type: 'RECIPE', title: 'Cơm đậu hũ sốt nấm', image: img('61241debf6'), dietarySchool: 'LACTO', cookTimeMinutes: 25, caloriesKcal: 480, voteCount: 37, isVerified: false, ingredients: ['đậu hũ', 'nấm', 'bơ thực vật', 'cơm'], daysAgo: 17 },
  { recipeId: 529, type: 'RECIPE', title: 'Mâm cơm chay ba món', image: img('6246a33d6d'), dietarySchool: 'OVO', cookTimeMinutes: 55, caloriesKcal: 620, voteCount: 29, isVerified: false, ingredients: ['cơm', 'trứng', 'rau cải', 'đậu hũ'], daysAgo: 18 },
  { recipeId: 530, type: 'VIDEO', title: 'Nấm đông cô kho gừng', image: img('6247cb782a'), dietarySchool: 'VEGAN', cookTimeMinutes: 40, caloriesKcal: 260, voteCount: 54, isVerified: true, ingredients: ['nấm đông cô', 'gừng', 'nước tương'], daysAgo: 19 },
  { recipeId: 531, type: 'RECIPE', title: 'Cà ri chay nước cốt dừa', image: img('660a32010d'), dietarySchool: 'VEGAN', cookTimeMinutes: 45, caloriesKcal: 540, voteCount: 90, isVerified: true, ingredients: ['khoai lang', 'cà rốt', 'nước cốt dừa', 'sả'], daysAgo: 20 },
  { recipeId: 532, type: 'RECIPE', title: 'Súp nấm kem chay', image: img('2cbff8dbd4'), dietarySchool: 'LACTO', cookTimeMinutes: 25, caloriesKcal: 300, voteCount: 19, isVerified: false, ingredients: ['nấm', 'sữa', 'bơ'], daysAgo: 21 },
  { recipeId: 533, type: 'RECIPE', title: 'Cà rốt nướng mật ong', image: img('0c9e9e0e87'), dietarySchool: 'LACTO_OVO', cookTimeMinutes: 35, caloriesKcal: 210, voteCount: 15, isVerified: false, ingredients: ['cà rốt', 'mật ong', 'thì là'], daysAgo: 22 },
];

/** So khớp không phân biệt dấu (giống collation CI_AI của SQL Server). */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const toDto = (r: MockRecipeItem) => ({
  recipeId: r.recipeId,
  type: r.type,
  title: r.title,
  imageUrl: r.image,
  dietarySchool: r.dietarySchool,
  cookTimeMinutes: r.cookTimeMinutes,
  caloriesKcal: r.caloriesKcal,
  voteCount: r.voteCount,
  isVerified: r.isVerified,
});

export const recipesHandlers = [
  http.get(api('/dietary-schools'), async () => {
    await latency();
    return ok(SCHOOLS);
  }),

  http.get(api('/recipes'), async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const q = url.searchParams;
    const keyword = q.get('keyword')?.trim() ?? '';
    const ingredient = q.get('ingredient')?.trim() ?? '';
    const schoolId = q.get('dietarySchoolId');
    const maxCookTime = q.get('maxCookTime');
    const contentType = q.get('contentType') ?? 'ALL';
    const sort = q.get('sort') ?? 'POPULAR';
    const page = Number(q.get('page') ?? 1);
    const size = Number(q.get('size') ?? 10);

    if (keyword === '#loi-he-thong') return fail(500, 'ERR_SYS_DATABASE_UNAVAILABLE', 'Không kết nối được cơ sở dữ liệu.');
    if (keyword === '#redis-down') return fail(503, 'ERR_SYS_REDIS_UNAVAILABLE', 'Dịch vụ tạm gián đoạn, vui lòng thử lại sau.');

    const details: { field: string; message: string }[] = [];
    if (keyword.length > 100) details.push({ field: 'keyword', message: 'Từ khóa tối đa 100 ký tự.' });
    if (ingredient.length > 50) details.push({ field: 'ingredient', message: 'Nguyên liệu tối đa 50 ký tự.' });
    if (schoolId !== null && !SCHOOLS.some((s) => s.dietarySchoolId === Number(schoolId)))
      details.push({ field: 'dietarySchoolId', message: 'Trường phái không hợp lệ.' });
    if (maxCookTime !== null && !(isPositiveInt(Number(maxCookTime)) && Number(maxCookTime) <= 600))
      details.push({ field: 'maxCookTime', message: 'maxCookTime trong khoảng 1–600 phút.' });
    if (!['ALL', 'RECIPE', 'VIDEO'].includes(contentType)) details.push({ field: 'contentType', message: 'contentType không hợp lệ.' });
    if (!['POPULAR', 'NEWEST'].includes(sort)) details.push({ field: 'sort', message: 'sort không hợp lệ.' });
    if (!isPositiveInt(page)) details.push({ field: 'page', message: 'page phải ≥ 1.' });
    if (!isPositiveInt(size) || size > 20) details.push({ field: 'size', message: 'size trong khoảng 1–20.' });
    if (details.length) return validationError(details);

    let list = RECIPES.slice();
    if (keyword) {
      const k = fold(keyword);
      list = list.filter((r) => fold(`${r.title} ${r.ingredients.join(' ')}`).includes(k));
    }
    if (ingredient) list = list.filter((r) => r.ingredients.some((i) => fold(i).includes(fold(ingredient))));
    if (schoolId !== null) {
      const code = SCHOOLS.find((s) => s.dietarySchoolId === Number(schoolId))?.schoolCode;
      list = list.filter((r) => r.dietarySchool === code);
    }
    if (maxCookTime !== null) list = list.filter((r) => r.cookTimeMinutes <= Number(maxCookTime));
    if (contentType !== 'ALL') list = list.filter((r) => r.type === contentType);
    list.sort((a, b) => (sort === 'NEWEST' ? a.daysAgo - b.daysAgo : b.voteCount - a.voteCount));

    const start = (page - 1) * size;
    const meta = {
      page,
      size,
      total: list.length,
      // BR-GUEST-01: chỉ Khách nhận vị trí mời đăng ký.
      ...(currentUser(request) ? {} : { signUpPromptAtItem: 5 }),
    };
    return ok(list.slice(start, start + size).map(toDto), 'OK', 200, meta);
  }),
];
