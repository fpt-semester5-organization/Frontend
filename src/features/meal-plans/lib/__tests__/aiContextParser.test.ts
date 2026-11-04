import { describe, expect, it } from 'vitest';
import { matchCustomInstructionsToSlots } from '../aiContextParser';

describe('matchCustomInstructionsToSlots', () => {
  const mockSlots = [
    {
      slotId: 101,
      mealType: 'BREAKFAST',
      recipe: { title: 'Canh củ sen hầm đậu đỏ bổ máu' },
    },
    {
      slotId: 102,
      mealType: 'LUNCH',
      recipe: { title: 'Cơm chiên kim chi đậu hũ cay ấm' },
    },
    {
      slotId: 103,
      mealType: 'DINNER',
      recipe: { title: 'Bánh xèo chay giòn rụm nhân nấm đậu xanh' },
    },
  ];

  it('trả về rỗng khi không có customInstructions hoặc danh sách slots rỗng', () => {
    expect(matchCustomInstructionsToSlots(mockSlots, null)).toEqual({});
    expect(matchCustomInstructionsToSlots(mockSlots, '')).toEqual({});
    expect(matchCustomInstructionsToSlots(mockSlots, '   ')).toEqual({});
    expect(matchCustomInstructionsToSlots([], 'Món canh ấm nóng')).toEqual({});
  });

  it('ánh xạ đúng món canh khi người dùng yêu cầu "Món canh ấm nóng, có bí đỏ"', () => {
    const result = matchCustomInstructionsToSlots(mockSlots, 'Món canh ấm nóng, có bí đỏ');
    // Món 101 có từ khóa "Canh" và "đậu đỏ"
    expect(result[101]).toBeDefined();
    expect(result[101]).toContain('canh');
  });

  it('ánh xạ món cụ thể theo từ khóa chính xác: cơm chiên', () => {
    const result = matchCustomInstructionsToSlots(mockSlots, 'trưa muốn ăn cơm chiên kim chi');
    expect(result[102]).toBe('trưa muốn ăn cơm chiên kim chi');
  });

  it('gán vào món đầu tiên khi yêu cầu mang tính chất chung cho toàn thực đơn (ví dụ: ít dầu, không cay)', () => {
    const result = matchCustomInstructionsToSlots(mockSlots, 'ít dầu, không cay');
    expect(result[101]).toBe('ít dầu, không cay');
  });

  it('hỗ trợ tách nhiều tiêu chí cho các bữa khác nhau', () => {
    const slots = [
      {
        slotId: 201,
        mealType: 'BREAKFAST',
        recipe: { title: 'Cháo hạt sen bí đỏ' },
      },
      {
        slotId: 202,
        mealType: 'LUNCH',
        recipe: { title: 'Cơm chiên nấm đùi gà sốt tiêu' },
      },
    ];

    const result = matchCustomInstructionsToSlots(slots, 'Sáng ăn cháo hạt sen bí đỏ, trưa ăn cơm chiên nấm');
    expect(result[201]).toBeDefined();
    expect(result[202]).toBeDefined();
  });
});
