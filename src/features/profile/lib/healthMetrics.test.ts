import { describe, expect, it } from 'vitest';
import { ageFrom, bmiCategory, calcBmi, estimateEnergy, parseDecimal } from './healthMetrics';

describe('parseDecimal', () => {
  it('nhận dấu phẩy hoặc dấu chấm', () => {
    expect(parseDecimal('54,5')).toBe(54.5);
    expect(parseDecimal(' 162 ')).toBe(162);
    expect(parseDecimal('54.25')).toBe(54.25);
  });
  it('chuỗi rỗng hoặc sai định dạng thì null', () => {
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('-5')).toBeNull();
    expect(parseDecimal('1e3')).toBeNull();
  });
});

describe('calcBmi (BR-USR-02)', () => {
  it('kg / m², làm tròn 1 chữ số', () => {
    expect(calcBmi(162, 54.5)).toBe(20.8);
    expect(calcBmi(170, 65)).toBe(22.5);
  });
  it('chiều cao/cân nặng ngoài khoảng thì không tính', () => {
    expect(calcBmi(49, 60)).toBeNull();
    expect(calcBmi(251, 60)).toBeNull();
    expect(calcBmi(170, 19)).toBeNull();
    expect(calcBmi(170, 301)).toBeNull();
    expect(calcBmi(null, 60)).toBeNull();
  });
});

describe('bmiCategory (ngưỡng WHO/WPRO châu Á)', () => {
  it.each([
    [18.4, 'UNDERWEIGHT'],
    [18.5, 'NORMAL'],
    [22.9, 'NORMAL'],
    [23, 'OVERWEIGHT'],
    [24.9, 'OVERWEIGHT'],
    [25, 'OBESE'],
  ])('BMI %s → %s', (bmi, category) => {
    expect(bmiCategory(bmi)).toBe(category);
  });
});

describe('ageFrom', () => {
  const today = new Date(2026, 9, 17); // 17/10/2026
  it('tính tuổi tròn, chưa tới sinh nhật thì trừ 1', () => {
    expect(ageFrom('2003-04-12', today)).toBe(23);
    expect(ageFrom('2016-10-17', today)).toBe(10);
    expect(ageFrom('2016-10-18', today)).toBe(9);
  });
  it('ngày không tồn tại thì null', () => {
    expect(ageFrom('2003-02-30', today)).toBeNull();
    expect(ageFrom('12/04/2003', today)).toBeNull();
  });
});

describe('estimateEnergy (BR-USR-NUT-03)', () => {
  it('Nữ: Mifflin-St Jeor −161, TDEE × 1,2, giảm cân −400 nhưng không dưới 1200', () => {
    expect(estimateEnergy({ gender: 'FEMALE', heightCm: 162, weightKg: 54.5, age: 23, goal: 'LOSE_WEIGHT' })).toEqual({
      bmrKcal: 1282,
      tdeeKcal: 1538,
      targetDailyCalories: 1200,
    });
  });
  it('Nam: +5, tăng cơ +400; sàn 1500', () => {
    expect(estimateEnergy({ gender: 'MALE', heightCm: 172, weightKg: 68, age: 28, goal: 'GAIN_MUSCLE' })).toEqual({
      bmrKcal: 1620,
      tdeeKcal: 1944,
      targetDailyCalories: 2344,
    });
    expect(estimateEnergy({ gender: 'MALE', heightCm: 150, weightKg: 40, age: 60, goal: 'LOSE_WEIGHT' }).targetDailyCalories).toBe(1500);
  });
});
