import { describe, expect, it } from 'vitest';
import type { DietarySchool, Ingredient } from './recipe.types';
import {
  EMPTY_RECIPE_FORM,
  estimateCalories,
  recipeFormSchema,
  schoolConflict,
  toRecipeBody,
  type IngredientRowValues,
  type RecipeFormValues,
} from './recipe.schemas';

const ingredient = (patch: Partial<Ingredient> = {}): Ingredient => ({
  ingredientId: 1,
  name: 'Đậu phụ',
  standardUnit: 'g',
  foodGroup: 'PLANT',
  isAllium: false,
  caloriesPer100g: 76,
  ...patch,
});

const row = (patch: Partial<IngredientRowValues> = {}): IngredientRowValues => ({
  ingredientId: 1,
  name: 'Đậu phụ',
  info: ingredient(),
  quantity: '300',
  unit: 'g',
  isOptional: false,
  ...patch,
});

const valid: RecipeFormValues = {
  ...EMPTY_RECIPE_FORM,
  title: 'Đậu phụ chiên sả ớt',
  dietarySchoolId: '1',
  categoryId: '4',
  cookTimeMinutes: '20',
  ingredients: [row()],
  instructions: [{ text: 'Cắt đậu.' }, { text: 'Chiên vàng.' }],
};

const VEGAN: DietarySchool = {
  dietarySchoolId: 1,
  schoolCode: 'VEGAN',
  schoolName: 'Thuần chay',
  forbiddenFoodGroups: ['EGG', 'DAIRY', 'POULTRY', 'SEAFOOD'],
  forbidAllium: false,
} as DietarySchool;
const BUDDHIST = { ...VEGAN, dietarySchoolId: 5, schoolCode: 'BUDDHIST', schoolName: 'Chay kiêng ngũ vị tân', forbidAllium: true } as DietarySchool;

const messages = (values: RecipeFormValues) => {
  const result = recipeFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};

describe('recipeFormSchema (SCR-13, BR-USR-05)', () => {
  it('form hợp lệ thì không có lỗi', () => {
    expect(messages(valid)).toEqual([]);
  });

  it('form trống báo đủ các trường bắt buộc', () => {
    const errors = messages(EMPTY_RECIPE_FORM);
    expect(errors).toEqual(
      expect.arrayContaining([
        'title: Tên món cần ít nhất 10 ký tự.',
        'dietarySchoolId: Vui lòng chọn trường phái ăn chay.',
        'categoryId: Vui lòng chọn danh mục món.',
        'cookTimeMinutes: Thời gian nấu phải lớn hơn 0 phút.',
        'ingredients.0.ingredientId: Chọn nguyên liệu từ danh sách gợi ý.',
        'ingredients.0.quantity: Nhập định lượng là số nguyên lớn hơn 0.',
        'ingredients.0.unit: Nhập đơn vị đo.',
        'instructions.0.text: Nhập nội dung bước hoặc xóa bước này.',
      ])
    );
  });

  it('cần ít nhất 2 bước và không trùng nguyên liệu', () => {
    expect(messages({ ...valid, instructions: [{ text: 'Một bước.' }] })).toContain('instructions: Cần ít nhất 2 bước thực hiện.');
    expect(messages({ ...valid, ingredients: [row(), row()] })).toContain('ingredients.1.ingredientId: Nguyên liệu này đã có ở dòng trên.');
  });

  it('thời gian nấu 0, khẩu phần 0, định lượng số lẻ đều sai', () => {
    const errors = messages({ ...valid, cookTimeMinutes: '0', servings: '0', ingredients: [row({ quantity: '1.5' })] });
    expect(errors).toEqual(
      expect.arrayContaining([
        'cookTimeMinutes: Thời gian nấu phải lớn hơn 0 phút.',
        'servings: Khẩu phần ít nhất 1 người.',
        'ingredients.0.quantity: Nhập định lượng là số nguyên lớn hơn 0.',
      ])
    );
  });
});

describe('toRecipeBody', () => {
  it('đổi sang số, bỏ trường tùy chọn để trống, isOptional chỉ gửi khi bật', () => {
    expect(toRecipeBody({ ...valid, ingredients: [row(), row({ ingredientId: 2, isOptional: true, unit: ' quả ' })] }, false)).toEqual({
      title: 'Đậu phụ chiên sả ớt',
      categoryId: 4,
      dietarySchoolId: 1,
      instructions: ['Cắt đậu.', 'Chiên vàng.'],
      cookTimeMinutes: 20,
      ingredients: [
        { ingredientId: 1, quantity: 300, unit: 'g' },
        { ingredientId: 2, quantity: 300, unit: 'quả', isOptional: true },
      ],
      submit: false,
    });
  });

  it('gửi đủ trường tùy chọn khi có nhập', () => {
    const body = toRecipeBody({ ...valid, description: ' Thơm ', prepTimeMinutes: '0', servings: '2', difficultyLevel: 'HARD' }, true);
    expect(body).toMatchObject({ description: 'Thơm', prepTimeMinutes: 0, servings: 2, difficultyLevel: 'HARD', submit: true });
  });
});

describe('schoolConflict (Red Alert, D109)', () => {
  it('trứng với Thuần chay, hành với Kiêng ngũ vị tân thì cảnh báo', () => {
    expect(schoolConflict(ingredient({ foodGroup: 'EGG' }), VEGAN)).toBe('Thuần chay không dùng trứng.');
    expect(schoolConflict(ingredient({ isAllium: true }), BUDDHIST)).toMatch(/kiêng ngũ vị tân/);
  });

  it('nguyên liệu thực vật hoặc chưa chọn trường phái thì không cảnh báo', () => {
    expect(schoolConflict(ingredient(), VEGAN)).toBeNull();
    expect(schoolConflict(ingredient({ foodGroup: 'EGG' }), undefined)).toBeNull();
  });
});

describe('estimateCalories', () => {
  it('chỉ tính các dòng đo bằng g, kg, ml, lít', () => {
    const rows = [
      row({ quantity: '300' }),
      row({ ingredientId: 2, unit: 'kg', quantity: '1', info: ingredient({ caloriesPer100g: 41 }) }),
      row({ ingredientId: 3, unit: 'quả', quantity: '2', info: ingredient({ caloriesPer100g: 155 }) }),
      row({ ingredientId: null, info: null }),
    ];
    expect(estimateCalories(rows)).toEqual({ kcal: 228 + 410, counted: 2, total: 3 });
  });
});
