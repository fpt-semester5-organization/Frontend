/**
 * Module phân tích và tổng hợp ngữ cảnh AI (Natural Language Context Parser).
 * Bóc tách ghi chú tự do của người dùng thành các Chip/Tag có cấu trúc:
 * - Số người / thành viên gia đình (ví dụ: 2 người lớn, 1 bé 3 tuổi)
 * - Khẩu vị & chế biến (ví dụ: Không ăn cay, Hạn chế đồ chiên, Thích món canh)
 * - Dị ứng & Món kiêng (ví dụ: Dị ứng đậu phộng, Kiêng nấm)
 * - Ngân sách (ví dụ: Ngân sách 100k/ngày)
 * - Mục tiêu dinh dưỡng (ví dụ: Giàu đạm thực vật, Ít calo)
 */

export type ContextCategory =
  | 'people'
  | 'allergy'
  | 'diet'
  | 'budget'
  | 'taste'
  | 'nutrition'
  | 'other';

export interface AiParsedChip {
  id: string;
  category: ContextCategory;
  label: string;
  icon?: string;
  colorClass?: string;
}

export interface ContextCategoryMeta {
  title: string;
  icon: string;
  badgeClass: string;
  dotColor: string;
}

export const CONTEXT_CATEGORIES: Record<ContextCategory, ContextCategoryMeta> = {
  people: {
    title: 'Thành viên',
    icon: 'family_restroom',
    badgeClass: 'bg-primary-fixed text-on-primary-fixed border border-primary/20',
    dotColor: 'bg-primary',
  },
  taste: {
    title: 'Khẩu vị',
    icon: 'restaurant',
    badgeClass: 'bg-secondary-fixed text-on-secondary-fixed border border-secondary/20',
    dotColor: 'bg-secondary',
  },
  allergy: {
    title: 'Dị ứng',
    icon: 'do_not_disturb_on',
    badgeClass: 'bg-error-container text-on-error-container border border-error/20',
    dotColor: 'bg-error',
  },
  diet: {
    title: 'Trường phái',
    icon: 'eco',
    badgeClass: 'bg-primary-fixed text-on-primary-fixed border border-primary/20',
    dotColor: 'bg-primary',
  },
  budget: {
    title: 'Ngân sách',
    icon: 'payments',
    badgeClass: 'bg-surface-container text-on-surface border border-outline-variant',
    dotColor: 'bg-secondary',
  },
  nutrition: {
    title: 'Dinh dưỡng',
    icon: 'health_and_safety',
    badgeClass: 'bg-primary-fixed-dim text-on-primary-fixed border border-primary/20',
    dotColor: 'bg-primary',
  },
  other: {
    title: 'Lưu ý khác',
    icon: 'lightbulb',
    badgeClass: 'bg-surface-container-low text-on-surface-variant border border-surface-container',
    dotColor: 'bg-outline',
  },
};

/** Gợi ý ngữ cảnh nhanh cho người dùng bấm chọn */
export const QUICK_CONTEXT_SUGGESTIONS: Array<{ label: string; category: ContextCategory }> = [
  { label: 'Không ăn cay', category: 'taste' },
  { label: 'Hạn chế đồ chiên', category: 'taste' },
  { label: 'Nhà có 2 người lớn', category: 'people' },
  { label: 'Có trẻ nhỏ (bé 3-5 tuổi)', category: 'people' },
  { label: 'Ngân sách ~100k/ngày', category: 'budget' },
  { label: 'Thích món canh ấm nóng', category: 'taste' },
  { label: 'Giàu đạm thực vật', category: 'nutrition' },
  { label: 'Ưu tiên rau củ luộc', category: 'taste' },
  { label: 'Ít dầu mỡ, thanh đạm', category: 'taste' },
  { label: 'Không ăn nấm', category: 'allergy' },
  { label: 'Không ngũ vị tân', category: 'diet' },
];

/**
 * Phân tích text ghi chú tự do thành danh sách Context Chips có cấu trúc.
 */
export function parseRawNoteToChips(rawNote: string): AiParsedChip[] {
  if (!rawNote || !rawNote.trim()) return [];

  const text = rawNote.trim();
  const chips: AiParsedChip[] = [];
  const addedLower = new Set<string>();

  const addChip = (label: string, category: ContextCategory) => {
    const cleanLabel = label.trim();
    const key = cleanLabel.toLowerCase();
    if (!key || addedLower.has(key)) return;
    addedLower.add(key);
    chips.push({
      id: `chip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      category,
      label: cleanLabel,
      icon: CONTEXT_CATEGORIES[category].icon,
    });
  };

  // 0. Khớp chính xác các tiêu chí gợi ý chuẩn trước
  for (const sug of QUICK_CONTEXT_SUGGESTIONS) {
    if (text.toLowerCase().includes(sug.label.toLowerCase())) {
      addChip(sug.label, sug.category);
    }
  }

  // 1. Phân tích Số người / Thành viên gia đình
  const peopleMatches = text.match(/(?:nhà có\s+)?(\d+\s*người\s*lớn|\d+\s*bé(?:\s*\d+\s*tuổi)?|\d+\s*trẻ\s*em|có\s*trẻ\s*nhỏ|người\s*cao\s*tuổi|\d+\s*người(?:\s*ăn)?)/gi);
  if (peopleMatches) {
    for (const match of peopleMatches) {
      let label = match.trim();
      const rawLower = label.toLowerCase();
      // Bỏ qua nếu đã có chip bao hàm cụm từ này
      if ([...addedLower].some((ex) => ex.includes(rawLower) || rawLower.includes(ex))) {
        continue;
      }
      label = label.replace(/^nhà có\s+/i, '').replace(/^có\s+/i, '');
      label = label.charAt(0).toUpperCase() + label.slice(1);
      if ([...addedLower].some((ex) => ex.includes(label.toLowerCase()) || label.toLowerCase().includes(ex))) {
        continue;
      }
      addChip(label, 'people');
    }
  }

  // 2. Phân tích Ngân sách
  const budgetMatches = text.match(/(?:ngân sách|chi phí|tầm|khoảng)\s*[:=]?\s*(\d+[kK]?|\d+[.,]?\d*\s*(?:triệu|tr|nghìn|ngàn|đ|vnd|vnđ))\s*(?:\/|\s*mỗi\s*|\s*cho\s*1\s*)?(?:ngày|bữa|tuần)?/gi) ||
                        text.match(/(\d+\s*k(?:\/|\s*)ngày|tiết kiệm|bình dân|cao cấp)/gi);
  if (budgetMatches) {
    for (const match of budgetMatches) {
      let bLabel = match.trim();
      const rawLower = bLabel.toLowerCase();
      if ([...addedLower].some((ex) => ex.includes(rawLower) || rawLower.includes(ex))) {
        continue;
      }
      if (!/^ngân sách/i.test(bLabel)) {
        bLabel = `Ngân sách: ${bLabel}`;
      }
      bLabel = bLabel.charAt(0).toUpperCase() + bLabel.slice(1);
      addChip(bLabel, 'budget');
    }
  }

  // 3. Phân tích Khẩu vị & Cách chế biến
  const tastePatterns: Array<{ regex: RegExp; label: string }> = [
    { regex: /không\s*(?:ăn\s*)?cay/i, label: 'Không ăn cay' },
    { regex: /(?:hạn chế|ít|không)\s*(?:đồ\s*)?(?:chiên|rán)/i, label: 'Hạn chế đồ chiên' },
    { regex: /ít\s*(?:dầu\s*)?mỡ/i, label: 'Ít dầu mỡ, thanh đạm' },
    { regex: /thích\s*(?:món\s*)?canh|thèm\s*canh/i, label: 'Thích món canh ấm nóng' },
    { regex: /món\s*nước/i, label: 'Ưu tiên món nước (bún, phở, cháo)' },
    { regex: /thanh\s*đạm/i, label: 'Khẩu vị thanh đạm' },
    { regex: /đậm\s*đà/i, label: 'Khẩu vị đậm đà' },
    { regex: /ít\s*ngọt/i, label: 'Ít ngọt' },
    { regex: /ít\s*muối|ít\s*mặn/i, label: 'Ít mặn' },
    { regex: /ưu\s*tiên\s*rau(?:\s*củ)?(?:\s*luộc)?/i, label: 'Ưu tiên rau củ luộc' },
    { regex: /dễ\s*nấu|nhanh\s*gọn/i, label: 'Nấu nhanh gọn (dưới 30 phút)' },
  ];
  for (const item of tastePatterns) {
    const rawLower = item.label.toLowerCase();
    if ([...addedLower].some((ex) => ex.includes(rawLower) || rawLower.includes(ex))) {
      continue;
    }
    if (item.regex.test(text)) {
      addChip(item.label, 'taste');
    }
  }

  // 4. Phân tích Dị ứng & Món kiêng
  const allergyPatterns: Array<{ regex: RegExp; label: string }> = [
    { regex: /(?:dị ứng|kiêng|không ăn)\s*(?:đậu\s*phộng|lạc)/i, label: 'Không ăn đậu phộng (lạc)' },
    { regex: /(?:dị ứng|kiêng|không ăn)\s*nấm/i, label: 'Không ăn nấm' },
    { regex: /(?:dị ứng|kiêng|không ăn)\s*(?:đậu\s*nành|đậu\s*hũ|đậu\s*phụ)/i, label: 'Không ăn đậu nành / đậu phụ' },
    { regex: /(?:dị ứng|kiêng|không ăn)\s*mè|vừng/i, label: 'Không ăn mè (vừng)' },
    { regex: /(?:dị ứng|kiêng|không ăn)\s*trứng/i, label: 'Không ăn trứng' },
    { regex: /(?:dị ứng|kiêng|không ăn)\s*sữa/i, label: 'Không dùng sữa động vật' },
  ];
  for (const item of allergyPatterns) {
    if (item.regex.test(text)) {
      addChip(item.label, 'allergy');
    }
  }

  // 5. Phân tích Trường phái
  const dietPatterns: Array<{ regex: RegExp; label: string }> = [
    { regex: /thuần\s*chay|vegan/i, label: 'Thuần chay (Vegan)' },
    { regex: /chay\s*kỳ/i, label: 'Ăn chay kỳ' },
    { regex: /không\s*ngũ\s*vị\s*tân/i, label: 'Kiêng ngũ vị tân (hành, tỏi, hẹ)' },
    { regex: /chay\s*có\s*trứng|ovo/i, label: 'Ăn chay có trứng' },
    { regex: /chay\s*có\s*sữa|lacto/i, label: 'Ăn chay có sữa' },
  ];
  for (const item of dietPatterns) {
    if (item.regex.test(text)) {
      addChip(item.label, 'diet');
    }
  }

  // 6. Phân tích Mục tiêu dinh dưỡng
  const nutritionPatterns: Array<{ regex: RegExp; label: string }> = [
    { regex: /giàu\s*(?:chất\s*)?đạm|protein/i, label: 'Giàu đạm thực vật' },
    { regex: /ít\s*calo|low\s*carb|ít\s*tinh\s*bột/i, label: 'Ít calo / Ít tinh bột' },
    { regex: /nhiều\s*(?:chất\s*)?xơ|nhiều\s*rau/i, label: 'Bổ sung nhiều chất xơ' },
    { regex: /giảm\s*cân|giữ\s*dáng/i, label: 'Hỗ trợ kiểm soát cân nặng' },
    { regex: /tăng\s*cân|tăng\s*cơ/i, label: 'Hỗ trợ tăng cơ bắp' },
    { regex: /bổ\s*máu|thiếu\s*máu/i, label: 'Bổ sung sắt & vi chất' },
  ];
  for (const item of nutritionPatterns) {
    if (item.regex.test(text)) {
      addChip(item.label, 'nutrition');
    }
  }

  // 7. Nếu chưa trích xuất được gì nhưng có text tách dấu phẩy hoặc chấm
  if (chips.length === 0) {
    const parts = text.split(/[,;.\n]+/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts.slice(0, 5)) {
      if (part.length >= 3 && part.length <= 40) {
        addChip(part, 'other');
      }
    }
  }

  return chips;
}

/**
 * Gom các chips thành chuỗi customInstructions hoàn chỉnh gửi lên Backend/AI.
 */
export function compileChipsToInstructions(chips: AiParsedChip[], customNote?: string): string {
  if (chips.length === 0) {
    return (customNote ?? '').trim();
  }

  const chipTexts = chips.map((c) => c.label).join(', ');
  if (!customNote || !customNote.trim()) {
    return chipTexts;
  }

  // Nếu trong customNote đã bao hàm rồi thì giữ sự súc tích
  const noteTrim = customNote.trim();
  if (noteTrim.length > 0 && !noteTrim.includes(chipTexts)) {
    return `${chipTexts}. Ghi chú thêm: ${noteTrim}`;
  }

  return chipTexts;
}

/**
 * Ánh xạ yêu cầu/ghi chú của người dùng (customInstructions) vào đúng món ăn mà AI đã chọn trong danh sách slots.
 * Trả về bản đồ { [slotId]: "chuỗi ghi chú/yêu cầu đã được AI áp dụng" }.
 */
export function matchCustomInstructionsToSlots<
  T extends { slotId: number; mealType?: string; recipe?: { title?: string } | null; notes?: string | null }
>(
  slots: T[],
  customInstructions?: string | null
): Record<number, string> {
  if (!customInstructions || !customInstructions.trim() || !slots || slots.length === 0) {
    return {};
  }

  const rawText = customInstructions.trim();
  const result: Record<number, string> = {};

  // 1. Tách chuỗi yêu cầu thành các phân đoạn/tiêu chí riêng biệt
  const rawSegments = rawText
    .split(/[,;.\n]+/)
    .map((s) => s.trim().replace(/^[-*•]\s*/, ''))
    .filter((s) => s.length > 0);

  // Stop words tiếng Việt cần loại trừ khi bóc từ khóa đơn
  const stopWords = new Set([
    'món', 'của', 'bạn', 'người', 'cho', 'với', 'và', 'nhưng', 'có', 'này', 'đó',
    'được', 'tôi', 'mình', 'yêu', 'cầu', 'hãy', 'giúp', 'nhé', 'muốn', 'thích',
    'thèm', 'cần', 'ăn', 'nấu', 'làm', 'thêm', 'bớt', 'phải', 'không', 'như',
    'các', 'những', 'nữa', 'lại', 'thì', 'là', 'ở', 'đây', 'kia', 'nào', 'chút'
  ]);

  const normalizeUnaccented = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  const normalizeRaw = (str: string) => str.toLowerCase().trim();

  const extractKeywords = (seg: string) => {
    return seg
      .toLowerCase()
      .split(/[\s+-_/:"]+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 2 && !stopWords.has(w));
  };

  const matchedSlotIds = new Set<number>();

  // 2. Với từng phân đoạn yêu cầu của người dùng, tìm slot khớp nhất
  for (const seg of rawSegments) {
    const isNegativeOrDietPreference = /^(?:không|kiêng|hạn chế|ít|tránh|dị ứng)\b/i.test(seg);
    if (isNegativeOrDietPreference) {
      // Bỏ qua việc tìm món chứa từ khóa bị kiêng/hạn chế (ví dụ "không cay" không được bắt vào món "cay")
      continue;
    }

    const segLower = normalizeRaw(seg);
    const segUnaccented = normalizeUnaccented(seg);
    const keywords = extractKeywords(seg);

    let bestSlot: T | null = null;
    let bestScore = 0;

    for (const slot of slots) {
      if (matchedSlotIds.has(slot.slotId)) continue;
      const rawTitle = slot.recipe?.title || '';
      if (!rawTitle) continue;

      const titleLower = normalizeRaw(rawTitle);
      const titleUnaccented = normalizeUnaccented(rawTitle);

      let score = 0;

      // Khớp trực tiếp cả cụm segment (có dấu hoặc không dấu)
      if (titleLower.includes(segLower) || segLower.includes(titleLower)) {
        score += 35;
      } else if (titleUnaccented.includes(segUnaccented) || segUnaccented.includes(titleUnaccented)) {
        score += 25;
      }

      // Khớp cụm từ khóa 2 chữ liên tiếp (bigram) ví dụ: "bí đỏ", "củ sen", "nấm rơm", "đậu hũ", "cơm chiên"
      for (let i = 0; i < keywords.length - 1; i++) {
        const bigram = `${keywords[i]} ${keywords[i + 1]}`;
        if (titleLower.includes(bigram)) score += 20;
        else if (titleUnaccented.includes(normalizeUnaccented(bigram))) score += 15;
      }

      // Khớp từng từ khóa riêng lẻ
      for (const kw of keywords) {
        if (titleLower.includes(kw)) score += 5;
        else if (titleUnaccented.includes(normalizeUnaccented(kw))) score += 4;
      }

      // Khớp theo bữa ăn nếu có chỉ định (sáng/trưa/tối)
      if (slot.mealType) {
        if ((segLower.includes('sáng') || segLower.includes('breakfast')) && slot.mealType === 'BREAKFAST') {
          score += 10;
        }
        if ((segLower.includes('trưa') || segLower.includes('lunch')) && slot.mealType === 'LUNCH') {
          score += 10;
        }
        if ((segLower.includes('tối') || segLower.includes('dinner')) && slot.mealType === 'DINNER') {
          score += 10;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    }

    if (bestSlot && bestScore >= 5) {
      result[bestSlot.slotId] = seg;
      matchedSlotIds.add(bestSlot.slotId);
    }
  }

  // 3. Nếu chưa slot nào khớp riêng lẻ (ví dụ yêu cầu dạng tổng quát: "ít dầu, không cay", "thanh đạm")
  if (matchedSlotIds.size === 0) {
    if (slots[0]) {
      // Yêu cầu khẩu vị chung cho toàn thực đơn: gán vào món đầu tiên để người dùng thấy rõ
      result[slots[0].slotId] = rawText;
    }
  } else if (matchedSlotIds.size === 1) {
    // Nếu chỉ có đúng 1 món khớp toàn bộ yêu cầu, hiển thị đầy đủ nguyên văn câu yêu cầu
    const singleSlotId = Array.from(matchedSlotIds)[0];
    result[singleSlotId] = rawText;
  }

  return result;
}
