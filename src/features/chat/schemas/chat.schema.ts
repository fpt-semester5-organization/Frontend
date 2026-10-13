import { z } from 'zod';

export const MESSAGE_MAX = 1000;

/** FN-CHAT-02: message 1–1000 ký tự. */
export const messageSchema = z.object({
  message: z.string().trim().min(1, 'Hãy nhập câu hỏi').max(MESSAGE_MAX, `Tối đa ${MESSAGE_MAX} ký tự`),
});

/** FN-CHAT-01: title <= 100, contextType mặc định NUTRITION_CONSULTATION. */
export const createSessionSchema = z.object({
  title: z.string().trim().max(100, 'Tối đa 100 ký tự').optional(),
  contextType: z
    .enum(['NUTRITION_CONSULTATION', 'MEAL_PLAN_ASSISTANT', 'EMPTY_FRIDGE'])
    .default('NUTRITION_CONSULTATION'),
});

/** FN-CHAT-06: contextQuestion <= 255, ratingScore 1–5, feedbackContent <= 1000. */
export const surveySchema = z.object({
  chatSessionId: z.number().int().min(1).optional(),
  contextQuestion: z.string().trim().min(1, 'Thiếu câu hỏi được đánh giá').max(255, 'Tối đa 255 ký tự'),
  ratingScore: z.number().int().min(1, 'Chọn từ 1 đến 5 sao').max(5, 'Chọn từ 1 đến 5 sao'),
  feedbackContent: z.string().trim().max(1000, 'Tối đa 1000 ký tự').optional(),
});

export type SurveyForm = z.infer<typeof surveySchema>;
export type CreateSessionForm = z.infer<typeof createSessionSchema>;
