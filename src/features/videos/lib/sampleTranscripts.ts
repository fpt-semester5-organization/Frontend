import type { TranscriptSegment } from '../types/transcript.types';

export const SAMPLE_VIDEO_URL =
  'https://res.cloudinary.com/demo/video/upload/samples/cld-sample-video.mp4';

/** Kịch bản bóc tách mẫu cho món: Súp nấm tuyết hạt sen táo đỏ (ID: 106) */
export const SUP_NAM_TUYET_SEGMENTS: TranscriptSegment[] = [
  {
    id: 1,
    start: 0.0,
    end: 3.8,
    text: 'Chào mọi người! Hôm nay VeggieLife sẽ hướng dẫn bạn nấu món Súp nấm tuyết hạt sen táo đỏ bổ dưỡng.',
  },
  {
    id: 2,
    start: 3.8,
    end: 7.5,
    text: 'Trước tiên, nấm tuyết khô ta ngâm trong nước ấm khoảng 15 phút cho nở bung rồi cắt bỏ gốc cứng.',
  },
  {
    id: 3,
    start: 7.5,
    end: 11.2,
    text: 'Hạt sen tươi rửa sạch, tách bỏ phần tâm sen xanh bên trong để nước súp không bị đắng.',
  },
  {
    id: 4,
    start: 11.2,
    end: 15.0,
    text: 'Táo đỏ và kỷ tử rửa sạch, dùng dao khía nhẹ vài đường quanh thân táo để dễ tiết vị ngọt thanh.',
  },
  {
    id: 5,
    start: 15.0,
    end: 20.0,
    text: 'Cho 1,2 lít nước vào nồi đun sôi, thả hạt sen và nấm tuyết vào hầm với lửa nhỏ khoảng 20 phút.',
  },
  {
    id: 6,
    start: 20.0,
    end: 25.5,
    text: 'Khi hạt sen đã bở mềm, ta cho táo đỏ, kỷ tử và đường phèn nguyên chất vào đun liu riu thêm 10 phút.',
  },
  {
    id: 7,
    start: 25.5,
    end: 30.0,
    text: 'Hòa tan 2 thìa bột năng với một chút nước lọc, rót từ từ vào nồi và khuấy đều tay tạo độ sánh mịn.',
  },
  {
    id: 8,
    start: 30.0,
    end: 36.0,
    text: 'Tắt bếp, múc súp ra tô dùng nóng hoặc để mát trong tủ lạnh đều rất thơm ngon và dưỡng nhan!',
  },
];

/** Kịch bản mẫu cho món Canh nấm đậu phụ rong biển */
export const CANH_NAM_SEGMENTS: TranscriptSegment[] = [
  {
    id: 1,
    start: 0.0,
    end: 4.2,
    text: 'Xin chào, hôm nay mình chia sẻ cách nấu món canh nấm đậu phụ rong biển thanh đạm cho bữa cơm chay.',
  },
  {
    id: 2,
    start: 4.2,
    end: 8.5,
    text: 'Rong biển khô ta ngâm với nước ấm khoảng 10 phút rồi vắt ráo nước, cắt miếng vừa ăn.',
  },
  {
    id: 3,
    start: 8.5,
    end: 13.0,
    text: 'Nấm rơm rửa sạch, cắt đôi; đậu phụ non cắt thành từng khối vuông nhỏ.',
  },
  {
    id: 4,
    start: 13.0,
    end: 18.5,
    text: 'Đun sôi nước dùng rau củ, cho nấm vào nấu trong 5 phút để nước ngọt và dậy mùi thơm.',
  },
  {
    id: 5,
    start: 18.5,
    end: 24.0,
    text: 'Thả đậu phụ và rong biển vào, nêm chút muối hầm và hạt nêm nấm chay vừa khẩu vị.',
  },
  {
    id: 6,
    start: 24.0,
    end: 30.0,
    text: 'Đun thêm 2 phút rồi tắt bếp, rắc tiêu xay và hành boa-rô lên trên là hoàn thành.',
  },
];

/** Kịch bản mẫu cho món Bún bò Huế */
export const BUN_BO_HUE_SEGMENTS: TranscriptSegment[] = [
  { id: 1, start: 0.0, end: 2.0, text: 'Hôm nay mình sẽ nấu bún bò huế.' },
  { id: 2, start: 2.0, end: 4.5, text: 'Đầu tiên, chần sơ sương bò và giò heo.' },
  { id: 3, start: 4.5, end: 7.2, text: 'Hầm sương cùng xả để nước dùng thơm ngọt và dầu màu điều tạo màu.' },
  { id: 4, start: 7.2, end: 10.0, text: 'Xép bún, thịt, ròi trang nước hổi, thêm rau thơm và thưởng thức thôi nào.' },
];

/** Tách văn bản thô (rawTranscript từ API) thành các câu có timestamp đồng bộ */
export function splitRawTranscriptToSegments(
  rawTranscript: string,
  totalDuration = 10
): TranscriptSegment[] {
  if (!rawTranscript || !rawTranscript.trim()) return [];

  // Tách theo dấu câu . ! ? \n hoặc dấu phẩy / chấm phẩy (đối với kết quả Whisper liền mạch)
  const rawClauses = rawTranscript
    .split(/(?<=[.!?\n,;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (rawClauses.length === 0) return [];

  // Gộp các mệnh đề liên từ quá ngắn (<= 2 từ như "đầu tiên,", "sau đó,") vào câu kế tiếp để phụ đề tự nhiên
  const clauses: string[] = [];
  for (let i = 0; i < rawClauses.length; i++) {
    const clause = rawClauses[i];
    const words = clause.split(/\s+/).length;
    if (words <= 2 && i + 1 < rawClauses.length) {
      rawClauses[i + 1] = `${clause} ${rawClauses[i + 1]}`;
    } else {
      clauses.push(clause);
    }
  }

  const wordCounts = clauses.map((s) => Math.max(1, s.split(/\s+/).length));
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  let currentStart = 0;
  return clauses.map((text, idx) => {
    const fraction = wordCounts[idx] / totalWords;
    const duration = fraction * totalDuration;
    const isLast = idx === clauses.length - 1;
    const end = isLast ? totalDuration : Math.min(totalDuration, Number((currentStart + duration).toFixed(2)));
    const seg: TranscriptSegment = {
      id: idx + 1,
      start: Number(currentStart.toFixed(2)),
      end: end,
      text,
    };
    currentStart = end;
    return seg;
  });
}

/** Lấy kịch bản theo ID món hoặc tiêu đề */
export function getTranscriptSegmentsForRecipe(
  recipeId?: number,
  title?: string
): TranscriptSegment[] {
  const normTitle = (title || '').toLowerCase();

  if (recipeId === 2221 || recipeId === 2013 || normTitle.includes('bún bò') || normTitle.includes('bun bo')) {
    return BUN_BO_HUE_SEGMENTS;
  }

  if (recipeId === 106 || normTitle.includes('tuyết') || normTitle.includes('hạt sen')) {
    return SUP_NAM_TUYET_SEGMENTS;
  }

  if (recipeId === 901 || normTitle.includes('rong biển') || normTitle.includes('đậu phụ')) {
    return CANH_NAM_SEGMENTS;
  }

  // Fallback mặc định tạo kịch bản 6 bước tổng quát cho các món khác
  const món = title ? title : 'món ăn này';
  return [
    { id: 1, start: 0.0, end: 4.0, text: `Chào bạn! Hôm nay chúng ta cùng thực hiện ${món}.` },
    { id: 2, start: 4.0, end: 9.0, text: 'Chuẩn bị đầy đủ các nguyên liệu rau củ tươi và sơ chế sạch sẽ.' },
    { id: 3, start: 9.0, end: 15.0, text: 'Bật bếp ở lửa vừa, cho một chút dầu thực vật và phi thơm gia vị.' },
    { id: 4, start: 15.0, end: 22.0, text: 'Cho các nguyên liệu chính vào xào chín tới và nêm gia vị thuần chay.' },
    { id: 5, start: 22.0, end: 28.0, text: 'Nấu thêm khoảng 5 đến 7 phút cho các hương vị hòa quyện đậm đà.' },
    { id: 6, start: 28.0, end: 35.0, text: 'Món ăn đã hoàn thành, dọn ra đĩa và thưởng thức cùng gia đình!' },
  ];
}
