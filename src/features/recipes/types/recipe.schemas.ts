import { z } from 'zod';
import type { CreateRecipeBody, DietarySchool, DifficultyLevel, Ingredient } from './recipe.types';

// Luật validate lấy đúng cột "Validate" của SCR-13 (UI Screen Specification) và cấu trúc bắt buộc BR-USR-05.

export const RECIPE_TITLE_MIN = 10;
export const RECIPE_TITLE_MAX = 100;
export const RECIPE_DESCRIPTION_MAX = 1000;
export const RECIPE_STEPS_MIN = 2;
/** Ingredients.Standard_Unit là NVARCHAR(20) (Data Dictionary). */
export const UNIT_MAX = 20;

export const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: 'EASY', label: 'Dễ' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HARD', label: 'Khó' },
];

/** Gợi ý đơn vị (Data Dictionary: g, kg, ml, muỗng canh, quả…); người dùng vẫn gõ được đơn vị khác. */
export const UNIT_SUGGESTIONS = ['g', 'kg', 'ml', 'lít', 'muỗng canh', 'muỗng cà phê', 'quả', 'củ', 'bó', 'lá', 'chén', 'miếng'];

const WHOLE_NUMBER = /^\d+$/;
const isWhole = (value: string, min: number) => WHOLE_NUMBER.test(value) && Number(value) >= min;

/** Một dòng nguyên liệu: `info` là bản ghi đã chọn từ GET /ingredients (để kiểm tra trường phái, ước tính calo). */
const ingredientRowSchema = z.object({
  // Kiểu trả về boolean (không phải type guard) để giá trị form vẫn là number | null.
  ingredientId: z.number().int().positive().nullable().refine((id): boolean => id !== null, 'Chọn nguyên liệu từ danh sách gợi ý.'),
  name: z.string(),
  info: z.custom<Ingredient | null>(),
  // UNSPECIFIED: OpenAPI để quantity là integer nên chưa nhận số lẻ (ví dụ 1,5 muỗng); đang hỏi Leader.
  quantity: z.string().trim().refine((value) => isWhole(value, 1), 'Nhập định lượng là số nguyên lớn hơn 0.'),
  unit: z.string().trim().min(1, 'Nhập đơn vị đo.').max(UNIT_MAX, `Đơn vị tối đa ${UNIT_MAX} ký tự.`),
  isOptional: z.boolean(),
});

export const recipeFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(RECIPE_TITLE_MIN, `Tên món cần ít nhất ${RECIPE_TITLE_MIN} ký tự.`)
    .max(RECIPE_TITLE_MAX, `Tên món tối đa ${RECIPE_TITLE_MAX} ký tự.`),
  dietarySchoolId: z.string().refine((value) => isWhole(value, 1), 'Vui lòng chọn trường phái ăn chay.'),
  categoryId: z.string().refine((value) => isWhole(value, 1), 'Vui lòng chọn danh mục món.'),
  description: z.string().trim().max(RECIPE_DESCRIPTION_MAX, `Mô tả tối đa ${RECIPE_DESCRIPTION_MAX} ký tự.`),
  prepTimeMinutes: z.string().trim().refine((value) => value === '' || isWhole(value, 0), 'Thời gian chuẩn bị là số phút ≥ 0.'),
  cookTimeMinutes: z.string().trim().refine((value) => isWhole(value, 1), 'Thời gian nấu phải lớn hơn 0 phút.'),
  servings: z.string().trim().refine((value) => value === '' || isWhole(value, 1), 'Khẩu phần ít nhất 1 người.'),
  difficultyLevel: z.enum(['', 'EASY', 'MEDIUM', 'HARD']),
  ingredients: z
    .array(ingredientRowSchema)
    .min(1, 'Cần ít nhất 1 nguyên liệu kèm định lượng và đơn vị.')
    .superRefine((rows, ctx) => {
      const seen = new Set<number>();
      rows.forEach((row, index) => {
        if (row.ingredientId === null) return;
        if (seen.has(row.ingredientId)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: [index, 'ingredientId'], message: 'Nguyên liệu này đã có ở dòng trên.' });
        }
        seen.add(row.ingredientId);
      });
    }),
  instructions: z
    .array(z.object({ text: z.string().trim().min(1, 'Nhập nội dung bước hoặc xóa bước này.') }))
    .min(RECIPE_STEPS_MIN, `Cần ít nhất ${RECIPE_STEPS_MIN} bước thực hiện.`),
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>;
export type IngredientRowValues = RecipeFormValues['ingredients'][number];

export const emptyIngredientRow = (): IngredientRowValues => ({
  ingredientId: null,
  name: '',
  info: null,
  quantity: '',
  unit: '',
  isOptional: false,
});

export const EMPTY_RECIPE_FORM: RecipeFormValues = {
  title: '',
  dietarySchoolId: '',
  categoryId: '',
  description: '',
  prepTimeMinutes: '',
  cookTimeMinutes: '',
  servings: '',
  difficultyLevel: '',
  ingredients: [emptyIngredientRow()],
  instructions: [{ text: '' }, { text: '' }],
};

/** Form → thân POST/PUT /recipes; trường tùy chọn để trống thì không gửi. */
export function toRecipeBody(values: RecipeFormValues, submit: boolean): CreateRecipeBody {
  return {
    title: values.title.trim(),
    categoryId: Number(values.categoryId),
    dietarySchoolId: Number(values.dietarySchoolId),
    ...(values.description.trim() ? { description: values.description.trim() } : {}),
    instructions: values.instructions.map((step) => step.text.trim()),
    ...(values.prepTimeMinutes.trim() ? { prepTimeMinutes: Number(values.prepTimeMinutes) } : {}),
    cookTimeMinutes: Number(values.cookTimeMinutes),
    ...(values.servings.trim() ? { servings: Number(values.servings) } : {}),
    ...(values.difficultyLevel ? { difficultyLevel: values.difficultyLevel } : {}),
    ingredients: values.ingredients.map((row) => ({
      ingredientId: row.ingredientId as number,
      quantity: Number(row.quantity),
      unit: row.unit.trim(),
      ...(row.isOptional ? { isOptional: true } : {}),
    })),
    submit,
  };
}

const FOOD_GROUP_LABEL: Record<string, string> = {
  EGG: 'trứng',
  DAIRY: 'sữa',
  POULTRY: 'thịt trắng',
  SEAFOOD: 'hải sản',
};

/**
 * Nguyên liệu thuộc nhóm bị cấm của trường phái (DietarySchools.Forbidden_Food_Rules, D109) thì server sẽ Red Alert.
 * Chỉ cảnh báo sớm trên giao diện; server mới là nơi quyết định.
 */
export function schoolConflict(info: Ingredient | null, school: DietarySchool | undefined): string | null {
  if (!info || !school) return null;
  if (school.forbidAllium && info.isAllium) return `${school.schoolName} kiêng ngũ vị tân (hành, tỏi, hẹ…).`;
  if (info.foodGroup !== 'PLANT' && (school.forbiddenFoodGroups as string[]).includes(info.foodGroup)) {
    return `${school.schoolName} không dùng ${FOOD_GROUP_LABEL[info.foodGroup] ?? 'nhóm thực phẩm này'}.`;
  }
  return null;
}

/** Quy đổi về gam cho các đơn vị đo khối lượng/thể tích (nước ≈ 1 g/ml). */
const GRAMS_PER_UNIT: Record<string, number> = { g: 1, gram: 1, gam: 1, kg: 1000, ml: 1, l: 1000, 'lít': 1000 };

/**
 * Ước tính calo từ Ingredients.Calories_Per_100g; chỉ tính dòng đo bằng g/kg/ml/lít.
 * Con số chính thức do server tính (Recipes.Calories_Kcal là giá trị dẫn xuất).
 */
export function estimateCalories(rows: IngredientRowValues[]): { kcal: number; counted: number; total: number } {
  let kcal = 0;
  let counted = 0;
  const filled = rows.filter((row) => row.info && isWhole(row.quantity.trim(), 1));
  for (const row of filled) {
    const grams = GRAMS_PER_UNIT[row.unit.trim().toLowerCase()];
    if (grams === undefined || !row.info) continue;
    kcal += (Number(row.quantity) * grams * row.info.caloriesPer100g) / 100;
    counted++;
  }
  return { kcal: Math.round(kcal), counted, total: filled.length };
}
