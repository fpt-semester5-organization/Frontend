import { describe, expect, it } from 'vitest';
import { cleanUserMessage } from './userMessage';

describe('cleanUserMessage (NFR UI-4)', () => {
  it('bỏ mã tham chiếu nội bộ trong câu của server', () => {
    expect(cleanUserMessage('Khách vãng lai gọi tính năng cá nhân hóa (FN-AUTH-03).')).toBe(
      'Khách vãng lai gọi tính năng cá nhân hóa.',
    );
    expect(cleanUserMessage('Không thể vô hiệu hóa Admin cuối cùng (BR-ADM-USR-001).')).toBe(
      'Không thể vô hiệu hóa Admin cuối cùng.',
    );
    expect(cleanUserMessage('Gói không tồn tại hoặc đã ngừng bán (ERR_PLAN_NOT_FOUND).')).toBe('Gói không tồn tại hoặc đã ngừng bán.');
    expect(cleanUserMessage('Theo quyết định (D104, D115) chỉ VIP được dùng.')).toBe('Theo quyết định chỉ VIP được dùng.');
  });

  it('giữ nguyên câu bình thường và phần ngoặc có nghĩa', () => {
    expect(cleanUserMessage('Nhập sai OTP quá 5 lần; khóa tạm thời 15 phút.')).toBe('Nhập sai OTP quá 5 lần; khóa tạm thời 15 phút.');
    expect(cleanUserMessage('Calo mục tiêu (kcal) phải lớn hơn 0.')).toBe('Calo mục tiêu (kcal) phải lớn hơn 0.');
    expect(cleanUserMessage('Bổ sung vitamin D3 và B12 mỗi ngày.')).toBe('Bổ sung vitamin D3 và B12 mỗi ngày.');
  });

  it('trả chuỗi rỗng cho thông báo kỹ thuật để nơi gọi dùng câu dự phòng', () => {
    expect(cleanUserMessage('Request failed with status code 503')).toBe('');
    expect(cleanUserMessage('Network Error')).toBe('');
    expect(cleanUserMessage('System.NullReferenceException: Object reference not set')).toBe('');
    expect(cleanUserMessage('    at VeggieLife.API.Controllers.ChatController.Send()')).toBe('');
    expect(cleanUserMessage(undefined)).toBe('');
  });
});
