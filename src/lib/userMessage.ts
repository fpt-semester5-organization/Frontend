/**
 * Làm sạch câu thông báo trước khi hiện cho người dùng (NFR UI-4: không hiện mã lỗi thô hoặc dấu vết ngăn xếp).
 *
 * Server đôi khi kèm mã tham chiếu trong câu, ví dụ "Khách vãng lai gọi tính năng cá nhân hóa (FN-AUTH-03)."
 * hoặc "... (BR-ADM-USR-001)". Các mã này chỉ dành cho nhóm phát triển nên được bỏ đi.
 * Chuỗi trông như lỗi kỹ thuật (stack trace, thông báo mặc định của axios/.NET) trả về '' để nơi gọi dùng câu dự phòng.
 */

/** Mã tham chiếu nội bộ: ERR_*, FN-*, BR-*, UC-*, NFR-*, SCR-*, quyết định D104… */
const CODE = /\b(?:ERR_[A-Z0-9_]+|(?:FN|BR|UC|NFR|SCR)-[A-Z0-9]+(?:-[A-Z0-9]+)*|D\d{2,3})\b/g;

/** Dấu hiệu của lỗi kỹ thuật không nên đưa lên giao diện. */
const TECHNICAL =
  /Request failed with status code|Network Error|timeout of \d+ms|Exception\b|\bat [\w$.<>]+\s*\(|^\s+at\s|System\.[A-Z]|Microsoft\.[A-Z]|stack ?trace|<!DOCTYPE|<html/i;

export function cleanUserMessage(text: string | null | undefined): string {
  if (!text) return '';
  const raw = String(text);
  if (TECHNICAL.test(raw)) return '';
  return raw
    .replace(CODE, '')
    .replace(/\(\s*[,;/–-]*\s*\)/g, '') // ngoặc chỉ còn dấu phân cách sau khi bỏ mã
    .replace(/\(\s*[,;]\s*/g, '(')
    .replace(/\s*[,;]\s*\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/([.!?])\1+/g, '$1')
    .trim();
}
