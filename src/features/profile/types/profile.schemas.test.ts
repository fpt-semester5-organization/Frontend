import { describe, expect, it } from 'vitest';
import {
  EMPTY_HEALTH_FORM,
  allergiesFormSchema,
  healthBodyFrom,
  healthFormSchema,
  profileFormSchema,
  toHealthBody,
  validateAvatar,
  weightEntrySchema,
  type HealthFormValues,
} from './profile.schemas';
import type { HealthProfile } from './profile.types';

const valid: HealthFormValues = {
  ...EMPTY_HEALTH_FORM,
  heightCm: '162',
  weightKg: '54,5',
  dateOfBirth: '2003-04-12',
  gender: 'FEMALE',
  dietarySchoolId: '1',
  healthGoal: 'LOSE_WEIGHT',
};

const errorsOf = (values: HealthFormValues) => {
  const result = healthFormSchema.safeParse(values);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
};

describe('healthFormSchema (SCR-08)', () => {
  it('form hợp lệ thì không lỗi', () => {
    expect(errorsOf(valid)).toEqual({});
  });

  it('chiều cao 50–250 cm, cân nặng 20–300 kg (biên vẫn hợp lệ)', () => {
    expect(errorsOf({ ...valid, heightCm: '49' }).heightCm).toBe('Chiều cao phải từ 50 đến 250 cm.');
    expect(errorsOf({ ...valid, heightCm: '250,1' }).heightCm).toBe('Chiều cao phải từ 50 đến 250 cm.');
    expect(errorsOf({ ...valid, heightCm: '50', weightKg: '300' })).toEqual({});
    expect(errorsOf({ ...valid, weightKg: '19,9' }).weightKg).toBe('Cân nặng phải từ 20 đến 300 kg.');
    expect(errorsOf({ ...valid, weightKg: '301' }).weightKg).toBe('Cân nặng phải từ 20 đến 300 kg.');
  });

  it('báo lỗi khi bỏ trống, sai định dạng hoặc quá 1 chữ số thập phân', () => {
    expect(errorsOf({ ...valid, heightCm: '' }).heightCm).toBe('Vui lòng nhập chiều cao.');
    expect(errorsOf({ ...valid, weightKg: 'năm mươi' }).weightKg).toBe('Cân nặng phải là số (ví dụ 54,5).');
    expect(errorsOf({ ...valid, weightKg: '54,55' }).weightKg).toBe('Cân nặng chỉ ghi tối đa 1 chữ số sau dấu phẩy.');
  });

  it('ngày sinh: tuổi ≥ 10, không ở tương lai, phải là ngày có thật', () => {
    const thisYear = new Date().getFullYear();
    expect(errorsOf({ ...valid, dateOfBirth: `${thisYear - 5}-01-01` }).dateOfBirth).toBe('Bạn cần đủ 10 tuổi để lập hồ sơ sức khỏe.');
    expect(errorsOf({ ...valid, dateOfBirth: `${thisYear + 1}-01-01` }).dateOfBirth).toBe('Ngày sinh không được ở tương lai.');
    expect(errorsOf({ ...valid, dateOfBirth: '2003-02-30' }).dateOfBirth).toBe('Ngày sinh không hợp lệ.');
  });

  it('bắt buộc chọn giới tính, trường phái, mục tiêu; cân nặng mục tiêu tùy chọn nhưng phải trong khoảng', () => {
    const errors = errorsOf({ ...valid, gender: '', dietarySchoolId: '', healthGoal: '', targetWeightKg: '10' });
    expect(errors).toMatchObject({
      gender: 'Vui lòng chọn giới tính.',
      dietarySchoolId: 'Vui lòng chọn trường phái ăn chay.',
      healthGoal: 'Vui lòng chọn mục tiêu sức khỏe.',
      targetWeightKg: 'Cân nặng mục tiêu phải từ 20 đến 300 kg.',
    });
  });
});

describe('toHealthBody / healthBodyFrom', () => {
  it('đổi chuỗi sang số, bỏ trường tùy chọn để trống', () => {
    expect(toHealthBody(valid)).toEqual({
      heightCm: 162,
      weightKg: 54.5,
      dateOfBirth: '2003-04-12',
      gender: 'FEMALE',
      dietarySchoolId: 1,
      healthGoal: 'LOSE_WEIGHT',
      requiresAlliumFree: false,
    });
    expect(toHealthBody({ ...valid, targetWeightKg: '52', regionPreference: 'SOUTH' })).toMatchObject({ targetWeightKg: 52, regionPreference: 'SOUTH' });
  });

  it('SCR-09 gửi lại số đo hiện có kèm trường phái mới', () => {
    const health = {
      gender: 'MALE',
      dateOfBirth: '1998-09-02',
      heightCm: 172,
      currentWeightKg: 68,
      targetWeightKg: null,
      healthGoal: 'MAINTAIN',
      regionPreference: 'CENTRAL',
      dietarySchool: { id: 1, code: 'VEGAN', name: 'Thuần chay' },
      requiresAlliumFree: false,
    } as unknown as HealthProfile;
    expect(healthBodyFrom(health, { dietarySchoolId: 5, requiresAlliumFree: true })).toEqual({
      heightCm: 172,
      weightKg: 68,
      dateOfBirth: '1998-09-02',
      gender: 'MALE',
      healthGoal: 'MAINTAIN',
      regionPreference: 'CENTRAL',
      dietarySchoolId: 5,
      requiresAlliumFree: true,
    });
  });
});

describe('profileFormSchema (SCR-07)', () => {
  it('họ tên 2–100 ký tự, số điện thoại theo ^0(3|5|7|8|9)[0-9]{8}$ hoặc để trống', () => {
    expect(profileFormSchema.safeParse({ fullName: 'An', phoneNumber: '' }).success).toBe(true);
    expect(profileFormSchema.safeParse({ fullName: 'A', phoneNumber: '' }).success).toBe(false);
    expect(profileFormSchema.safeParse({ fullName: 'Nguyễn An', phoneNumber: '0912345678' }).success).toBe(true);
    expect(profileFormSchema.safeParse({ fullName: 'Nguyễn An', phoneNumber: '0212345678' }).success).toBe(false);
    expect(profileFormSchema.safeParse({ fullName: 'Nguyễn An', phoneNumber: '091234567' }).success).toBe(false);
  });

  it('ảnh đại diện JPEG/PNG/WEBP ≤ 5 MB', () => {
    expect(validateAvatar(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
    expect(validateAvatar(new File(['x'], 'a.gif', { type: 'image/gif' }))).toBe('Ảnh đại diện phải là JPEG, PNG hoặc WEBP.');
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
    expect(validateAvatar(big)).toBe('Ảnh đại diện tối đa 5 MB.');
  });
});

describe('weightEntrySchema & allergiesFormSchema', () => {
  it('ghi cân nặng: 20–300 kg, tối đa 2 chữ số thập phân, không ghi ngày tương lai', () => {
    expect(weightEntrySchema.safeParse({ weightKg: '53,25', loggedDate: '', note: '' }).success).toBe(true);
    expect(weightEntrySchema.safeParse({ weightKg: '53,255', loggedDate: '', note: '' }).success).toBe(false);
    expect(weightEntrySchema.safeParse({ weightKg: '15', loggedDate: '', note: '' }).success).toBe(false);
    expect(weightEntrySchema.safeParse({ weightKg: '60', loggedDate: '2999-01-01', note: '' }).success).toBe(false);
  });

  it('dị ứng tối đa 20 mục, ghi chú ≤ 255 ký tự', () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ allergenId: i + 1, notes: '' }));
    expect(allergiesFormSchema.safeParse({ allergens: many.slice(0, 20) }).success).toBe(true);
    expect(allergiesFormSchema.safeParse({ allergens: many }).success).toBe(false);
    expect(allergiesFormSchema.safeParse({ allergens: [{ allergenId: 1, notes: 'x'.repeat(256) }] }).success).toBe(false);
  });
});
