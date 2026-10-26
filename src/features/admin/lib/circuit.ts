import type { Tone } from './labels';

/** Trạng thái Circuit Breaker AI (BR-ADM-AI-002). Giá trị `circuit.state` chưa được liệt kê trong spec: nhận biết theo tên, còn lại hiển thị nguyên văn. */
export function circuitView(state?: string): { text: string; tone: Tone; known: boolean } {
  const s = (state ?? '').toUpperCase();
  if (!s) return { text: 'Chưa rõ trạng thái AI', tone: 'neutral', known: false };
  if (s === 'CLOSED' || s === 'OK' || s === 'HEALTHY') return { text: 'AI hoạt động bình thường', tone: 'ok', known: true };
  if (s === 'OPEN') return { text: 'AI đang ngắt mạch tạm thời', tone: 'bad', known: true };
  if (s === 'HALF_OPEN' || s === 'HALF-OPEN') return { text: 'AI đang thử kết nối lại', tone: 'warn', known: true };
  return { text: `Mạch AI: ${state}`, tone: 'neutral', known: false };
}
