import type { ChatSource } from '../types/chat.types';
import { PATHS } from '@/routes/paths';

export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'cite'; index: number; source: ChatSource | null };

/** Tách [S1], [S2]... trong câu trả lời để gắn với sources[] (S1 = phần tử đầu tiên). */
export function splitCitations(content: string, sources: ChatSource[] | undefined): Segment[] {
  const out: Segment[] = [];
  const re = /\[S(\d{1,2})\]/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(content))) {
    if (m.index > last) {
      out.push({ kind: 'text', text: content.slice(last, m.index) });
    }
    const index = Number(m[1]);
    out.push({ kind: 'cite', index, source: sources?.[index - 1] ?? null });
    last = m.index + m[0].length;
  }

  if (last < content.length) {
    out.push({ kind: 'text', text: content.slice(last) });
  }

  return out;
}

/** Đường dẫn tới nguồn nếu loại nguồn đã biết (RECIPE / POST / VIDEO); loại khác chỉ hiện tiêu đề. */
export function sourceHref(s: ChatSource): string | null {
  switch (s.type.toUpperCase()) {
    case 'RECIPE':
      return PATHS.RECIPES.DETAIL(s.id);
    case 'POST':
      return PATHS.COMMUNITY.POST_DETAIL(s.id);
    case 'VIDEO':
      return PATHS.VIDEOS.DETAIL(s.id);
    default:
      return null;
  }
}

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  RECIPE: 'Công thức',
  POST: 'Bài viết',
  VIDEO: 'Video',
  NUTRITION_DOC: 'Tài liệu dinh dưỡng',
  DICTIONARY: 'Từ điển',
};

export const sourceTypeLabel = (t: string) => SOURCE_TYPE_LABEL[t.toUpperCase()] ?? t;
