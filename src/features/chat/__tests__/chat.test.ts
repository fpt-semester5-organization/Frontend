import { describe, expect, it, beforeEach } from 'vitest';
import { sourceHref, sourceTypeLabel, splitCitations } from '../lib/content';
import { createSessionSchema, messageSchema, surveySchema } from '../schemas/chat.schema';
import { mergeGuestQuota } from '@/lib/guestQuota';
import { useGuestStore } from '@/stores/guest.store';
import type { ChatSource } from '../types/chat.types';

describe('Tiện ích phân tích trích dẫn và nguồn RAG (content.ts)', () => {
  const sampleSources: ChatSource[] = [
    { type: 'RECIPE', id: 512, title: 'Canh nấm đậu phụ rong biển' },
    { type: 'NUTRITION_DOC', id: 10, title: 'Cẩm nang dinh dưỡng thực vật (WHO)' },
    { type: 'POST', id: 77, title: 'Một tuần ăn chay đầu tiên' },
    { type: 'VIDEO', id: 88, title: 'Hướng dẫn làm tempeh' },
  ];

  it('tách chính xác [S1], [S2] khớp theo vị trí trong mảng sources', () => {
    const text = 'Bạn nên nạp đạm từ Canh nấm đậu phụ [S1] và tài liệu [S2], cũng như bài viết [S3].';
    const segments = splitCitations(text, sampleSources);

    expect(segments.length).toBe(7);
    expect(segments[0]).toEqual({ kind: 'text', text: 'Bạn nên nạp đạm từ Canh nấm đậu phụ ' });
    expect(segments[1]).toEqual({ kind: 'cite', index: 1, source: sampleSources[0] });
    expect(segments[2]).toEqual({ kind: 'text', text: ' và tài liệu ' });
    expect(segments[3]).toEqual({ kind: 'cite', index: 2, source: sampleSources[1] });
    expect(segments[4]).toEqual({ kind: 'text', text: ', cũng như bài viết ' });
    expect(segments[5]).toEqual({ kind: 'cite', index: 3, source: sampleSources[2] });
    expect(segments[6]).toEqual({ kind: 'text', text: '.' });

  });

  it('xử lý khi chỉ số [S99] không tồn tại trong danh sách sources', () => {
    const text = 'Nguồn chưa xác định [S99].';
    const segments = splitCitations(text, sampleSources);

    expect(segments.length).toBe(3);
    expect(segments[1]).toEqual({ kind: 'cite', index: 99, source: null });
  });

  it('dựng đúng URL điều hướng cho từng loại nguồn', () => {
    expect(sourceHref({ type: 'RECIPE', id: 512, title: 'Món chay' })).toBe('/recipes/512');
    expect(sourceHref({ type: 'POST', id: 77, title: 'Bài viết' })).toBe('/community/posts/77');
    expect(sourceHref({ type: 'VIDEO', id: 88, title: 'Video' })).toBe('/videos/88');
    expect(sourceHref({ type: 'NUTRITION_DOC', id: 10, title: 'Tài liệu' })).toBeNull();
    expect(sourceHref({ type: 'DICTIONARY', id: 1, title: 'Từ điển' })).toBeNull();
  });

  it('trả về nhãn tiếng Việt tương ứng cho từng loại nguồn', () => {
    expect(sourceTypeLabel('RECIPE')).toBe('Công thức');
    expect(sourceTypeLabel('POST')).toBe('Bài viết');
    expect(sourceTypeLabel('VIDEO')).toBe('Video');
    expect(sourceTypeLabel('NUTRITION_DOC')).toBe('Tài liệu dinh dưỡng');
    expect(sourceTypeLabel('DICTIONARY')).toBe('Từ điển');
  });
});

describe('Kiểm tra xác thực Zod Schema (chat.schema.ts)', () => {
  it('messageSchema: chặn chuỗi rỗng và giới hạn tối đa 1000 ký tự (FN-CHAT-02)', () => {
    expect(messageSchema.safeParse({ message: '' }).success).toBe(false);
    expect(messageSchema.safeParse({ message: '   ' }).success).toBe(false);
    expect(messageSchema.safeParse({ message: 'a'.repeat(1001) }).success).toBe(false);

    const valid = messageSchema.safeParse({ message: 'Hỏi về thực đơn 75g đạm mỗi ngày' });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.message).toBe('Hỏi về thực đơn 75g đạm mỗi ngày');
    }
  });

  it('createSessionSchema: hỗ trợ contextType mặc định và title <= 100 ký tự (FN-CHAT-01)', () => {
    const defaultRes = createSessionSchema.safeParse({});
    expect(defaultRes.success).toBe(true);
    if (defaultRes.success) {
      expect(defaultRes.data.contextType).toBe('NUTRITION_CONSULTATION');
    }

    expect(createSessionSchema.safeParse({ title: 'x'.repeat(101) }).success).toBe(false);
  });

  it('surveySchema: kiểm tra ratingScore 1-5 sao và độ dài câu hỏi (FN-CHAT-06)', () => {
    expect(surveySchema.safeParse({ contextQuestion: 'Câu hỏi', ratingScore: 0 }).success).toBe(false);
    expect(surveySchema.safeParse({ contextQuestion: 'Câu hỏi', ratingScore: 6 }).success).toBe(false);
    expect(surveySchema.safeParse({ contextQuestion: '', ratingScore: 5 }).success).toBe(false);
    expect(surveySchema.safeParse({ contextQuestion: 'x'.repeat(256), ratingScore: 5 }).success).toBe(false);

    const validSurvey = surveySchema.safeParse({
      chatSessionId: 12,
      contextQuestion: 'Cách nạp đủ đạm?',
      ratingScore: 5,
      feedbackContent: 'Câu trả lời rất chi tiết và đúng khoa học.',
    });
    expect(validSurvey.success).toBe(true);
  });
});

describe('Đồng bộ hạn mức dùng thử Khách vãng lai (guestQuota.ts)', () => {
  beforeEach(() => {
    useGuestStore.getState().reset();
  });

  it('cập nhật quota AI khi người dùng là Khách vãng lai', () => {
    mergeGuestQuota(
      { ai: { limit: 3, used: 1, remaining: 2 } },
      true
    );

    const quota = useGuestStore.getState().quota;
    expect(quota?.ai.used).toBe(1);
    expect(quota?.ai.remaining).toBe(2);
    expect(quota?.ai.limit).toBe(3);
  });

  it('bỏ qua cập nhật khi người dùng đã là Thành viên (isGuest = false)', () => {
    mergeGuestQuota(
      { ai: { limit: 20, used: 5, remaining: 15 } },
      false
    );

    const quota = useGuestStore.getState().quota;
    expect(quota).toBeNull();
  });
});
