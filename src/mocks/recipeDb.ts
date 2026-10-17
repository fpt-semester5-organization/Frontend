// Dữ liệu giả công thức & danh mục dùng chung (FN-POST-01..04, FN-PROF-08) cho MSW (chỉ dev). Tải lại trang là về ban đầu.

export type MockRecipeStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED_ACTIVE'
  | 'REJECTED'
  | 'QUARANTINED_HIDDEN'
  | 'ARCHIVED'
  | 'DELETED';
export type MockFoodGroup = 'PLANT' | 'EGG' | 'DAIRY' | 'POULTRY' | 'SEAFOOD';

/** Seed 07 trường phái (DietarySchools, BR-ADM-MAS-001). */
export const dietarySchools = [
  { dietarySchoolId: 1, schoolCode: 'VEGAN', schoolName: 'Thuần chay', forbiddenFoodGroups: ['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 2, schoolCode: 'OVO', schoolName: 'Ăn chay có trứng', forbiddenFoodGroups: ['DAIRY', 'POULTRY', 'SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 3, schoolCode: 'LACTO', schoolName: 'Ăn chay có sữa', forbiddenFoodGroups: ['EGG', 'POULTRY', 'SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 4, schoolCode: 'LACTO_OVO', schoolName: 'Ăn chay có trứng và sữa', forbiddenFoodGroups: ['POULTRY', 'SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 5, schoolCode: 'BUDDHIST', schoolName: 'Chay kiêng ngũ vị tân', forbiddenFoodGroups: ['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'], forbidAllium: true },
  { dietarySchoolId: 6, schoolCode: 'POLLOTARIAN', schoolName: 'Chay ăn thịt trắng', forbiddenFoodGroups: ['SEAFOOD'], forbidAllium: false },
  { dietarySchoolId: 7, schoolCode: 'PESCATARIAN', schoolName: 'Chay ăn hải sản', forbiddenFoodGroups: ['POULTRY'], forbidAllium: false },
] as const;
export type MockSchoolCode = (typeof dietarySchools)[number]['schoolCode'];

/** FoodCategories (FN-PROF-08). */
export const categories = [
  { categoryId: 1, categoryName: 'Món canh', isCore: true },
  { categoryId: 2, categoryName: 'Món kho', isCore: true },
  { categoryId: 3, categoryName: 'Món xào & sốt', isCore: true },
  { categoryId: 4, categoryName: 'Món chiên', isCore: true },
  { categoryId: 5, categoryName: 'Gỏi & salad', isCore: true },
  { categoryId: 6, categoryName: 'Bún, phở & món nước', isCore: true },
  { categoryId: 7, categoryName: 'Cơm & món chính', isCore: true },
  { categoryId: 8, categoryName: 'Món hấp & luộc', isCore: false },
  { categoryId: 9, categoryName: 'Súp & cháo', isCore: false },
];

export const allergens = [
  { allergenId: 1, code: 'SOY', allergenName: 'Đậu nành' },
  { allergenId: 2, code: 'GLUTEN', allergenName: 'Gluten' },
  { allergenId: 3, code: 'PEANUT', allergenName: 'Đậu phộng' },
  { allergenId: 4, code: 'SESAME', allergenName: 'Mè' },
  { allergenId: 5, code: 'TREE_NUT', allergenName: 'Hạt cây' },
  { allergenId: 6, code: 'MILK', allergenName: 'Sữa' },
  { allergenId: 7, code: 'EGG', allergenName: 'Trứng' },
];

export interface MockIngredient {
  ingredientId: number;
  name: string;
  standardUnit: string;
  foodGroup: MockFoodGroup;
  isAllium: boolean;
  caloriesPer100g: number;
}

/** [tên, đơn vị chuẩn, kcal/100g, nhóm, ngũ vị tân] — mã nguyên liệu tăng dần từ 1. */
const INGREDIENT_ROWS: [string, string, number, MockFoodGroup?, boolean?][] = [
  ['Đậu phụ', 'g', 76], ['Đậu hũ non', 'g', 55], ['Nấm rơm', 'g', 31], ['Nấm hương tươi', 'g', 34],
  ['Nấm hương khô', 'g', 296], ['Nấm đùi gà', 'g', 35], ['Nấm mèo', 'g', 25], ['Nấm kim châm', 'g', 37],
  ['Rong biển khô', 'g', 306], ['Hạt sen', 'g', 89], ['Bánh tráng', 'lá', 333], ['Bún tươi', 'g', 110],
  ['Rau thơm', 'g', 20], ['Xà lách', 'g', 15], ['Đậu phộng', 'g', 567], ['Khoai môn', 'g', 112],
  ['Cà rốt', 'g', 41], ['Củ sắn', 'g', 38], ['Cà chua', 'g', 18], ['Bắp cải tím', 'g', 31],
  ['Bánh phở', 'g', 143], ['Củ cải trắng', 'g', 18], ['Hoa hồi', 'g', 337], ['Cơm gạo lứt', 'g', 111],
  ['Đậu Hà Lan', 'g', 81], ['Bí xanh', 'g', 13], ['Rau mầm', 'g', 30], ['Mè rang', 'g', 573],
  ['Chanh', 'quả', 29], ['Bông cải xanh', 'g', 34], ['Đậu bắp', 'g', 33], ['Nước tương', 'ml', 53],
  ['Tiêu đen', 'g', 251], ['Tương ớt', 'g', 93], ['Sả', 'g', 99], ['Chả chay', 'g', 180],
  ['Gừng', 'g', 80], ['Khoai lang', 'g', 86], ['Nước cốt dừa', 'ml', 230], ['Cơm trắng', 'g', 130],
  ['Rau cải ngọt', 'g', 13], ['Đường', 'g', 387], ['Muối', 'g', 0], ['Dầu ăn thực vật', 'ml', 884],
  ['Nước dùng rau củ', 'ml', 5], ['Mật ong', 'g', 304], ['Thì là', 'g', 43], ['Bơ thực vật', 'g', 717],
  ['Hạt điều', 'g', 553], ['Đậu nành', 'g', 446],
  ['Trứng gà', 'quả', 155, 'EGG'], ['Sữa tươi', 'ml', 61, 'DAIRY'], ['Bơ lạt', 'g', 717, 'DAIRY'],
  ['Phô mai', 'g', 402, 'DAIRY'], ['Sữa chua', 'g', 61, 'DAIRY'], ['Ức gà', 'g', 165, 'POULTRY'],
  ['Tôm', 'g', 99, 'SEAFOOD'], ['Mực', 'g', 92, 'SEAFOOD'],
  ['Hành lá', 'g', 32, 'PLANT', true], ['Hành tím', 'g', 72, 'PLANT', true], ['Tỏi', 'g', 149, 'PLANT', true],
  ['Hẹ', 'g', 30, 'PLANT', true], ['Kiệu', 'g', 51, 'PLANT', true],
];

export const ingredients: MockIngredient[] = INGREDIENT_ROWS.map(([name, standardUnit, caloriesPer100g, foodGroup = 'PLANT', isAllium = false], index) => ({
  ingredientId: index + 1,
  name,
  standardUnit,
  foodGroup,
  isAllium,
  caloriesPer100g,
}));

const ingredientByName = (name: string) => {
  const found = ingredients.find((item) => item.name === name);
  if (!found) throw new Error(`[mock] Thiếu nguyên liệu "${name}" trong recipeDb`);
  return found;
};

export interface MockRecipe {
  recipeId: number;
  authorId: number;
  type: 'RECIPE' | 'VIDEO';
  title: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: number;
  dietarySchoolId: number;
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD' | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number;
  instructions: string[];
  ingredients: { ingredientId: number; quantity: number; unit: string; isOptional: boolean }[];
  status: MockRecipeStatus;
  isVerified: boolean;
  baseVotes: number;
  caloriesKcal: number;
  hasTranscript: boolean;
  createdAt: string;
}

const img = (name: string) => `/images/${name}.jpg`;
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const schoolId = (code: MockSchoolCode) => dietarySchools.find((s) => s.schoolCode === code)!.dietarySchoolId;

type Seed = {
  id: number;
  title: string;
  image: string;
  school: MockSchoolCode;
  category: number;
  times: [prep: number, cook: number];
  servings: number;
  level: 'EASY' | 'MEDIUM' | 'HARD';
  kcal: number;
  votes: number;
  verified?: boolean;
  video?: boolean;
  author?: number;
  days: number;
  description: string;
  items: [name: string, quantity: number, unit?: string][];
  steps: string[];
};

const SEEDS: Seed[] = [
  {
    id: 512, title: 'Canh nấm đậu phụ rong biển', image: '1872b5755f', school: 'VEGAN', category: 1, times: [10, 25], servings: 2, level: 'EASY', kcal: 310, votes: 42, verified: true, days: 1,
    description: 'Món canh thanh đạm, ngọt tự nhiên từ nấm và rong biển, nấu nhanh cho bữa tối.',
    items: [['Nấm rơm', 200], ['Đậu phụ', 300], ['Rong biển khô', 10], ['Nước dùng rau củ', 1000], ['Muối', 5]],
    steps: [
      'Ngâm rong biển với nước ấm khoảng 10 phút rồi vắt ráo.',
      'Rửa sạch nấm rơm, cắt đôi; cắt đậu phụ thành khối vuông vừa ăn.',
      'Đun sôi nước dùng, cho nấm vào nấu 5 phút.',
      'Thả đậu phụ và rong biển, nêm muối, nấu thêm 3 phút rồi tắt bếp.',
    ],
  },
  {
    id: 513, title: 'Đậu hũ kho nấm niêu đất', image: '09b8f62b58', school: 'VEGAN', category: 2, times: [15, 35], servings: 3, level: 'MEDIUM', kcal: 380, votes: 128, verified: true, video: true, days: 2,
    description: 'Đậu hũ áp chảo kho cùng nấm hương và hạt sen trong niêu đất, đậm đà mà vẫn thanh.',
    items: [['Đậu phụ', 400], ['Nấm hương khô', 30], ['Hạt sen', 100], ['Nước tương', 30], ['Đường', 10], ['Tiêu đen', 2]],
    steps: [
      'Ngâm nấm hương cho mềm, cắt bỏ chân; hấp hạt sen 15 phút.',
      'Cắt đậu hũ quân cờ, áp chảo vàng hai mặt.',
      'Cho đậu, nấm, hạt sen vào niêu, thêm nước tương, đường và nửa chén nước, kho lửa nhỏ 15 phút.',
      'Rắc tiêu, tắt bếp và dùng nóng với cơm.',
    ],
  },
  {
    id: 514, title: 'Gỏi cuốn rau củ chấm tương đậu', image: '22f3765374', school: 'BUDDHIST', category: 5, times: [20, 20], servings: 4, level: 'EASY', kcal: 260, votes: 87, verified: true, days: 3,
    description: 'Gỏi cuốn tươi mát với đậu phụ chiên, rau thơm và nước chấm tương đậu phộng.',
    items: [['Bánh tráng', 12, 'lá'], ['Bún tươi', 200], ['Rau thơm', 100], ['Đậu phụ', 200], ['Đậu phộng', 50], ['Cà rốt', 100]],
    steps: [
      'Chiên đậu phụ vàng, cắt thanh dài; cà rốt bào sợi.',
      'Nhúng bánh tráng qua nước, xếp rau thơm, bún, cà rốt, đậu phụ rồi cuốn chặt tay.',
      'Giã đậu phộng rang, trộn với tương để làm nước chấm.',
    ],
  },
  {
    id: 515, title: 'Chả giò khoai môn', image: '2931d9f03b', school: 'VEGAN', category: 4, times: [30, 45], servings: 4, level: 'MEDIUM', kcal: 420, votes: 64, days: 4,
    description: 'Chả giò giòn rụm, nhân khoai môn bùi béo cùng nấm mèo và cà rốt.',
    items: [['Khoai môn', 300], ['Nấm mèo', 30], ['Cà rốt', 100], ['Bánh tráng', 20, 'lá'], ['Dầu ăn thực vật', 300]],
    steps: [
      'Bào sợi khoai môn và cà rốt; ngâm nấm mèo rồi thái nhỏ.',
      'Trộn nhân với chút muối, tiêu; cuốn nhân vào bánh tráng.',
      'Chiên ngập dầu lửa vừa đến khi vàng giòn, vớt ra để ráo dầu.',
    ],
  },
  {
    id: 516, title: 'Salad đậu hũ ngũ sắc', image: '2b6936ec9e', school: 'VEGAN', category: 5, times: [10, 15], servings: 2, level: 'EASY', kcal: 290, votes: 51, verified: true, days: 5,
    description: 'Salad nhiều màu sắc, giàu đạm thực vật, sốt chanh mè nhẹ nhàng.',
    items: [['Đậu phụ', 200], ['Xà lách', 150], ['Cà chua', 150], ['Bắp cải tím', 100], ['Mè rang', 10], ['Chanh', 1, 'quả']],
    steps: ['Áp chảo đậu phụ, cắt khối nhỏ.', 'Rửa sạch rau, cắt vừa ăn; trộn với đậu phụ.', 'Vắt chanh, rắc mè rang và trộn đều trước khi ăn.'],
  },
  {
    id: 517, title: 'Phở chay nấm nước dùng rau củ', image: '2c71727880', school: 'BUDDHIST', category: 6, times: [20, 60], servings: 4, level: 'MEDIUM', kcal: 380, votes: 96, verified: true, video: true, days: 6,
    description: 'Nước dùng ninh từ củ cải, gừng nướng và hoa hồi, không dùng hành tỏi.',
    items: [['Bánh phở', 500], ['Nấm đùi gà', 200], ['Củ cải trắng', 500], ['Hoa hồi', 5], ['Gừng', 30], ['Rau thơm', 100]],
    steps: [
      'Nướng gừng và hoa hồi cho thơm; củ cải cắt khúc.',
      'Ninh củ cải cùng gừng, hoa hồi với 2,5 lít nước trong 45 phút, nêm muối.',
      'Xé nấm đùi gà, áp chảo; trụng bánh phở.',
      'Xếp bánh phở, nấm, rau thơm vào tô rồi chan nước dùng nóng.',
    ],
  },
  {
    id: 518, title: 'Đậu hũ non sốt cà chua', image: '2edd6eeddf', school: 'VEGAN', category: 3, times: [5, 18], servings: 2, level: 'EASY', kcal: 240, votes: 39, days: 7,
    description: 'Đậu hũ non mềm mịn trong sốt cà chua chua ngọt, món nhanh cho ngày bận.',
    items: [['Đậu hũ non', 300], ['Cà chua', 250], ['Hành lá', 20], ['Nước tương', 15], ['Đường', 5]],
    steps: ['Cà chua băm nhỏ, xào với chút dầu đến khi sệt.', 'Nêm nước tương, đường; cho đậu hũ non vào rim 5 phút.', 'Rắc hành lá rồi tắt bếp.'],
  },
  {
    id: 519, title: 'Cơm gạo lứt rau củ áp chảo', image: '2f0a1969da', school: 'LACTO_OVO', category: 7, times: [10, 30], servings: 2, level: 'EASY', kcal: 450, votes: 58, verified: true, days: 8,
    description: 'Cơm gạo lứt đảo cùng trứng và rau củ, đủ chất cho bữa trưa.',
    items: [['Cơm gạo lứt', 300], ['Trứng gà', 2, 'quả'], ['Đậu Hà Lan', 80], ['Cà rốt', 80], ['Nước tương', 15]],
    steps: ['Cà rốt thái hạt lựu, luộc sơ cùng đậu Hà Lan.', 'Đánh trứng, chiên tơi rồi để riêng.', 'Áp chảo cơm gạo lứt, cho rau củ, trứng và nước tương vào đảo đều.'],
  },
  {
    id: 520, title: 'Canh đậu hũ cà chua', image: '31e841c9b1', school: 'VEGAN', category: 1, times: [5, 15], servings: 2, level: 'EASY', kcal: 180, votes: 33, days: 9,
    description: 'Canh chua nhẹ, nấu trong 15 phút.',
    items: [['Đậu phụ', 200], ['Cà chua', 200], ['Hành lá', 10], ['Muối', 3]],
    steps: ['Xào cà chua cho mềm rồi thêm 600 ml nước.', 'Khi sôi cho đậu phụ cắt miếng vào, nêm muối.', 'Nấu thêm 3 phút, rắc hành lá.'],
  },
  {
    id: 521, title: 'Nem rán chay nhân nấm', image: 'ded969492e', school: 'VEGAN', category: 4, times: [30, 50], servings: 4, level: 'MEDIUM', kcal: 360, votes: 72, video: true, days: 10,
    description: 'Nem rán vỏ giòn, nhân nấm hương, nấm mèo và củ sắn ngọt mát.',
    items: [['Bánh tráng', 20, 'lá'], ['Nấm mèo', 30], ['Củ sắn', 200], ['Nấm hương tươi', 100], ['Dầu ăn thực vật', 300]],
    steps: ['Thái nhỏ nấm và củ sắn, xào sơ cho ráo nước.', 'Cuốn nhân vào bánh tráng, gói chặt hai đầu.', 'Rán lửa vừa đến khi vàng đều.'],
  },
  {
    id: 522, title: 'Đậu hũ sốt tương ớt', image: '363d6ff0f6', school: 'VEGAN', category: 3, times: [5, 20], servings: 2, level: 'EASY', kcal: 270, votes: 45, verified: true, days: 11,
    description: 'Đậu hũ chiên giòn áo lớp sốt tương ớt cay ngọt.',
    items: [['Đậu phụ', 300], ['Tương ớt', 30], ['Mè rang', 5], ['Đường', 5]],
    steps: ['Chiên đậu phụ vàng giòn.', 'Đun tương ớt với đường và chút nước đến khi sánh.', 'Cho đậu vào đảo đều, rắc mè rang.'],
  },
  {
    id: 523, title: 'Bún Huế chay', image: '377125941e', school: 'VEGAN', category: 6, times: [30, 70], servings: 4, level: 'HARD', kcal: 500, votes: 81, verified: true, days: 12,
    description: 'Nước dùng thơm sả, cay nồng, ăn kèm chả chay và nấm đùi gà.',
    items: [['Bún tươi', 500], ['Sả', 50], ['Nấm đùi gà', 200], ['Chả chay', 200], ['Nước dùng rau củ', 2000], ['Tương ớt', 15]],
    steps: [
      'Đập dập sả, cho vào nước dùng ninh 30 phút.',
      'Phi sa tế từ tương ớt, cho vào nồi để tạo màu.',
      'Nấm đùi gà xé sợi, chả chay cắt lát, cho vào nồi nấu 10 phút.',
      'Trụng bún, chan nước dùng và xếp nấm, chả lên trên.',
    ],
  },
  {
    id: 524, title: 'Canh bí xanh nấm rơm', image: '384dd41e1c', school: 'BUDDHIST', category: 1, times: [10, 20], servings: 3, level: 'EASY', kcal: 150, votes: 27, days: 13,
    description: 'Canh giải nhiệt, ngọt thanh từ bí xanh và nấm rơm.',
    items: [['Bí xanh', 400], ['Nấm rơm', 150], ['Muối', 3]],
    steps: ['Gọt vỏ bí xanh, cắt miếng vừa ăn; nấm rơm cắt đôi.', 'Đun sôi 800 ml nước, cho bí và nấm vào nấu 10 phút, nêm muối.'],
  },
  {
    id: 525, title: 'Rau mầm trộn mè rang', image: '417f827b32', school: 'VEGAN', category: 5, times: [5, 10], servings: 2, level: 'EASY', kcal: 160, votes: 22, days: 14,
    description: 'Món trộn giòn mát, làm trong 10 phút.',
    items: [['Rau mầm', 150], ['Mè rang', 10], ['Chanh', 1, 'quả'], ['Nước tương', 10]],
    steps: ['Rửa sạch rau mầm, để ráo.', 'Trộn nước tương với nước cốt chanh, rưới lên rau và rắc mè rang.'],
  },
  {
    id: 526, title: 'Rau củ luộc chấm kho quẹt chay', image: '55e020cc9c', school: 'VEGAN', category: 8, times: [10, 25], servings: 3, level: 'EASY', kcal: 230, votes: 48, verified: true, days: 15,
    description: 'Rau củ luộc chấm kho quẹt chay mặn ngọt, đậm vị miền Nam.',
    items: [['Bông cải xanh', 200], ['Cà rốt', 150], ['Đậu bắp', 150], ['Nước tương', 30], ['Đường', 15], ['Tiêu đen', 2]],
    steps: ['Luộc chín tới bông cải, cà rốt, đậu bắp.', 'Đun nước tương, đường, tiêu lửa nhỏ đến khi sệt làm kho quẹt.', 'Chấm rau củ với kho quẹt khi còn ấm.'],
  },
  {
    id: 527, title: 'Đậu hũ kho tiêu', image: '605416fa38', school: 'VEGAN', category: 2, times: [5, 30], servings: 2, level: 'EASY', kcal: 320, votes: 66, verified: true, days: 16,
    description: 'Đậu hũ kho tiêu cay ấm, hợp với cơm trắng ngày mưa.',
    items: [['Đậu phụ', 300], ['Tiêu đen', 5], ['Nước tương', 30], ['Đường', 10]],
    steps: ['Chiên đậu phụ vàng.', 'Thắng đường thành màu cánh gián, thêm nước tương và chút nước.', 'Cho đậu vào kho lửa nhỏ 15 phút, rắc nhiều tiêu.'],
  },
  {
    id: 528, title: 'Cơm đậu hũ sốt nấm', image: '61241debf6', school: 'LACTO', category: 7, times: [10, 25], servings: 2, level: 'EASY', kcal: 480, votes: 37, days: 17,
    description: 'Đậu hũ và nấm hương sốt bơ béo nhẹ, ăn kèm cơm nóng.',
    items: [['Cơm trắng', 300], ['Đậu phụ', 200], ['Nấm hương tươi', 150], ['Bơ lạt', 15]],
    steps: ['Áp chảo đậu phụ, để riêng.', 'Xào nấm hương với bơ lạt, thêm chút nước tương và nước để làm sốt.', 'Cho đậu vào sốt, rưới lên cơm nóng.'],
  },
  {
    id: 529, title: 'Mâm cơm chay ba món', image: '6246a33d6d', school: 'OVO', category: 7, times: [20, 55], servings: 4, level: 'MEDIUM', kcal: 620, votes: 29, days: 18,
    description: 'Trứng chiên, rau cải xào và đậu hũ sốt cho bữa cơm gia đình.',
    items: [['Cơm trắng', 600], ['Trứng gà', 3, 'quả'], ['Rau cải ngọt', 300], ['Đậu phụ', 300]],
    steps: ['Chiên trứng mỏng, cuộn lại cắt khoanh.', 'Xào rau cải ngọt với chút muối.', 'Đậu phụ chiên rồi rim nước tương; dọn cùng cơm.'],
  },
  {
    id: 530, title: 'Nấm đông cô kho gừng', image: '6247cb782a', school: 'VEGAN', category: 2, times: [15, 40], servings: 3, level: 'MEDIUM', kcal: 260, votes: 54, verified: true, video: true, days: 19,
    description: 'Nấm đông cô dai ngọt kho cùng gừng ấm bụng.',
    items: [['Nấm hương khô', 50], ['Gừng', 30], ['Nước tương', 30], ['Đường', 10]],
    steps: ['Ngâm nấm đông cô cho nở, vắt ráo; gừng thái sợi.', 'Phi gừng thơm, cho nấm vào xào săn.', 'Thêm nước tương, đường và nước, kho lửa nhỏ 25 phút.'],
  },
  {
    id: 531, title: 'Cà ri chay nước cốt dừa', image: '660a32010d', school: 'VEGAN', category: 7, times: [20, 45], servings: 4, level: 'MEDIUM', kcal: 540, votes: 90, verified: true, days: 20,
    description: 'Cà ri béo thơm nước cốt dừa với khoai lang, cà rốt và đậu phụ.',
    items: [['Khoai lang', 300], ['Cà rốt', 200], ['Nước cốt dừa', 400], ['Sả', 30], ['Đậu phụ', 200]],
    steps: ['Khoai lang, cà rốt cắt khối; đậu phụ chiên sơ.', 'Phi sả với bột cà ri, cho rau củ vào xào.', 'Thêm nước, hầm 20 phút rồi cho nước cốt dừa và đậu phụ, nấu thêm 5 phút.'],
  },
  {
    id: 532, title: 'Súp nấm kem chay', image: '2cbff8dbd4', school: 'LACTO', category: 9, times: [10, 25], servings: 2, level: 'EASY', kcal: 300, votes: 19, days: 21,
    description: 'Súp nấm sánh mịn với sữa tươi và bơ.',
    items: [['Nấm hương tươi', 200], ['Sữa tươi', 300], ['Bơ lạt', 20]],
    steps: ['Xào nấm với bơ lạt cho thơm.', 'Thêm sữa tươi và chút nước, nấu 10 phút rồi xay mịn.', 'Nêm muối tiêu, dùng nóng.'],
  },
  {
    id: 533, title: 'Cà rốt nướng mật ong', image: '0c9e9e0e87', school: 'LACTO_OVO', category: 8, times: [10, 35], servings: 2, level: 'EASY', kcal: 210, votes: 15, days: 22,
    description: 'Cà rốt nướng caramel mật ong, ăn kèm sữa chua và thì là.',
    items: [['Cà rốt', 400], ['Mật ong', 20], ['Thì là', 5], ['Sữa chua', 100]],
    steps: ['Trộn cà rốt với mật ong và chút dầu.', 'Nướng 200°C trong 30 phút, trở mặt giữa chừng.', 'Bày cùng sữa chua, rắc thì là.'],
  },
];

export const recipes: MockRecipe[] = SEEDS.map((seed) => ({
  recipeId: seed.id,
  authorId: seed.author ?? (seed.id % 2 === 0 ? 2048 : 3072),
  type: seed.video ? 'VIDEO' : 'RECIPE',
  title: seed.title,
  description: seed.description,
  imageUrl: img(seed.image),
  categoryId: seed.category,
  dietarySchoolId: schoolId(seed.school),
  difficultyLevel: seed.level,
  servings: seed.servings,
  prepTimeMinutes: seed.times[0],
  cookTimeMinutes: seed.times[1],
  instructions: seed.steps,
  ingredients: seed.items.map(([name, quantity, unit]) => {
    const ingredient = ingredientByName(name);
    return { ingredientId: ingredient.ingredientId, quantity, unit: unit ?? ingredient.standardUnit, isOptional: false };
  }),
  status: 'APPROVED_ACTIVE',
  isVerified: seed.verified ?? false,
  baseVotes: seed.votes,
  caloriesKcal: seed.kcal,
  hasTranscript: seed.video ?? false,
  createdAt: daysAgo(seed.days),
}));

// Công thức không công khai: GET /recipes/{id} trả 404 (chỉ APPROVED_ACTIVE).
recipes.push(
  { ...recipes[0], recipeId: 540, authorId: 1024, title: 'Bản nháp: cháo đậu xanh hạt sen', status: 'DRAFT', baseVotes: 0, createdAt: daysAgo(0.2) },
  { ...recipes[1], recipeId: 541, authorId: 1024, title: 'Lẩu nấm bị báo cáo', status: 'QUARANTINED_HIDDEN', baseVotes: 0, createdAt: daysAgo(0.5) }
);

/** `${userId}:${recipeId}` của các lượt thả tim công thức trong phiên. */
export const recipeVotes = new Set<string>();

const counters = { recipe: 600 };
export const nextRecipeId = () => counters.recipe++;

export const findIngredient = (id: number) => ingredients.find((item) => item.ingredientId === id);
export const findSchool = (id: number) => dietarySchools.find((school) => school.dietarySchoolId === id);
