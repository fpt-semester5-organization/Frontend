// Dữ liệu giả trong bộ nhớ cho MSW (chỉ dev). Tải lại trang là dữ liệu trở về ban đầu.

export type MockRole = 'MEMBER' | 'VIP' | 'ADMIN';
export type MockPostStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED_ACTIVE'
  | 'REJECTED'
  | 'QUARANTINED_HIDDEN'
  | 'DELETED';
export type MockCommentStatus = 'ACTIVE' | 'FLAGGED' | 'QUARANTINED_HIDDEN';

export interface MockUser {
  userId: number;
  fullName: string;
  email: string;
  role: MockRole;
  isVip: boolean;
  createdAt: string;
}

export interface MockVideo {
  videoId: number;
  videoUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  status: 'PROCESSING' | 'READY' | 'FAILED' | 'BANNED';
  title?: string;
}

export interface MockExtractedRecipe {
  title: string;
  ingredients: { name: string; quantity: number; unit: string }[];
  steps: string[];
}

/** Bản ghi VideoTranscripts giả. Nội dung là đoạn chữ cố định thay cho kết quả Whisper + Gemini (AI-Service chưa xong). */
export interface MockTranscript {
  videoId: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  rawTranscript: string;
  extractedRecipe: MockExtractedRecipe;
  /** PENDING: mốc (ms) chuyển sang COMPLETED. */
  readyAt?: number;
  /** Công thức đã được tác giả xác nhận và duyệt: người xem khác mới thấy (Leader câu 6). */
  recipeApproved: boolean;
  /** Số lần POST extract-recipe kế tiếp trả 503 ERR_AI_CIRCUIT_OPEN, để thử banner "Dịch vụ tạm gián đoạn". */
  circuitOpenTimes?: number;
}

export interface MockPost {
  postId: number;
  authorId: number;
  title: string;
  content: string;
  imageUrl: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  status: MockPostStatus;
  baseVotes: number;
  createdAt: string;
  videos: MockVideo[];
  recipes: { recipeId: number; title: string }[];
}

export interface MockComment {
  commentId: number;
  postId: number;
  authorId: number;
  parentCommentId: number | null;
  content: string;
  status: MockCommentStatus;
  isSoftDeleted: boolean;
  createdAt: string;
}

export interface MockReport {
  reportId: number;
  reporterId: number;
  targetType: 'POST' | 'RECIPE' | 'VIDEO' | 'COMMENT';
  targetId: number;
  createdAt: string;
}

/** Mật khẩu chung của các tài khoản giả. */
export const MOCK_PASSWORD = 'Veggie@2026';

export const users: MockUser[] = [
  { userId: 1024, fullName: 'Nguyễn An', email: 'an.nguyen@gmail.com', role: 'MEMBER', isVip: false, createdAt: '2026-09-01T02:00:00Z' },
  { userId: 2048, fullName: 'Trần Bình', email: 'binh.tran@gmail.com', role: 'VIP', isVip: true, createdAt: '2026-08-15T02:00:00Z' },
  { userId: 3072, fullName: 'Lê Minh Chi', email: 'chi.le@gmail.com', role: 'MEMBER', isVip: false, createdAt: '2026-07-20T02:00:00Z' },
];

const cover = (background: string, accent: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="${background}"/><circle cx="470" cy="120" r="90" fill="${accent}" opacity="0.55"/><circle cx="180" cy="260" r="120" fill="${accent}" opacity="0.35"/><path d="M300 250c40-90 120-120 190-110-10 80-70 150-190 110z" fill="#ffffff" opacity="0.8"/></svg>`
  )}`;

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600 * 1000).toISOString();

export const posts: MockPost[] = [
  {
    postId: 77,
    authorId: 1024,
    title: 'Một tuần ăn chay đầu tiên của tôi',
    content:
      'Tuần trước mình quyết định thử ăn chay trọn 7 ngày. Ngày đầu khá khó vì quen ăn mặn, nhưng từ ngày thứ ba mình bắt đầu thấy nhẹ người hơn.\n\nMẹo của mình: chuẩn bị sẵn đậu phụ, nấm và rau củ cho cả tuần, nấu canh rong biển buổi tối và luôn có một hộp hạt điều để ăn vặt.',
    imageUrl: cover('#dfeadf', '#4f6f58'),
    visibility: 'PUBLIC',
    status: 'APPROVED_ACTIVE',
    baseVotes: 12,
    createdAt: hoursAgo(5),
    videos: [],
    recipes: [{ recipeId: 512, title: 'Canh nấm đậu phụ rong biển' }],
  },
  {
    postId: 78,
    authorId: 2048,
    title: 'Bí quyết làm nước dùng chay ngọt thanh',
    content:
      'Nước dùng chay ngon cần ba thứ: củ cải trắng, bắp ngọt và nấm hương khô. Hầm lửa nhỏ khoảng 90 phút, vớt bọt thường xuyên, cuối cùng nêm một chút đường phèn.',
    imageUrl: cover('#f8e3d6', '#94532f'),
    visibility: 'PUBLIC',
    status: 'APPROVED_ACTIVE',
    baseVotes: 31,
    createdAt: hoursAgo(20),
    videos: [],
    recipes: [],
  },
  {
    postId: 79,
    authorId: 3072,
    title: 'Ăn chay có đủ đạm không? Trải nghiệm 6 tháng',
    content:
      'Nhiều bạn hỏi mình ăn chay có thiếu đạm không. Sau 6 tháng, mình kết hợp đậu nành, đậu lăng, hạt chia và gạo lứt, chỉ số sức khỏe vẫn ổn định. Nên kiểm tra định kỳ và tham khảo chuyên gia dinh dưỡng.',
    imageUrl: null,
    visibility: 'PUBLIC',
    status: 'APPROVED_ACTIVE',
    baseVotes: 45,
    createdAt: hoursAgo(30),
    videos: [],
    recipes: [],
  },
  {
    postId: 80,
    authorId: 2048,
    title: 'Thực đơn chay cho người bận rộn',
    content:
      'Sáng: yến mạch ngâm qua đêm với sữa hạt. Trưa: cơm gạo lứt, đậu hũ sốt cà, rau luộc. Tối: bún xào rau củ. Chuẩn bị nguyên liệu vào cuối tuần giúp tiết kiệm rất nhiều thời gian.',
    imageUrl: cover('#e8e6df', '#636a60'),
    visibility: 'PUBLIC',
    status: 'APPROVED_ACTIVE',
    baseVotes: 18,
    createdAt: hoursAgo(48),
    videos: [],
    recipes: [],
  },
  {
    postId: 81,
    authorId: 3072,
    title: 'Những loại nấm dễ mua để nấu món chay',
    content:
      'Nấm rơm, nấm đùi gà, nấm kim châm, nấm hương và nấm mỡ đều dễ mua ở chợ. Nấm đùi gà xé sợi xào sả ớt rất hợp với cơm trắng.',
    imageUrl: cover('#f1ede8', '#7a4429'),
    visibility: 'PUBLIC',
    status: 'APPROVED_ACTIVE',
    baseVotes: 9,
    createdAt: hoursAgo(60),
    videos: [],
    recipes: [],
  },
  {
    postId: 82,
    authorId: 1024,
    title: 'Ghi chú riêng: danh sách món muốn thử',
    content: 'Bánh xèo chay, lẩu nấm, chả giò chay, cà ri khoai lang, bún riêu chay.',
    imageUrl: null,
    visibility: 'PRIVATE',
    status: 'APPROVED_ACTIVE',
    baseVotes: 0,
    createdAt: hoursAgo(70),
    videos: [],
    recipes: [],
  },
  {
    postId: 83,
    authorId: 1024,
    title: 'Bản nháp: kinh nghiệm đi chợ chay',
    content: 'Đang viết dở...',
    imageUrl: null,
    visibility: 'PUBLIC',
    status: 'DRAFT',
    baseVotes: 0,
    createdAt: hoursAgo(72),
    videos: [],
    recipes: [],
  },
  ...[
    ['Làm sữa hạt điều tại nhà chỉ với 3 bước', '#f8e3d6', '#bd7653', 3072, 22],
    ['Món chay ngày Tết: gợi ý mâm cỗ đơn giản', '#f2d2c0', '#94532f', 2048, 27],
    ['Đậu hũ non sốt nấm: món tủ của gia đình mình', '#f7f3ee', '#8a5a0b', 3072, 14],
    ['Ăn chay và tập gym: mình đã thay đổi thế nào', '#dfeadf', '#3d5c47', 2048, 38],
    ['Rau củ theo mùa ở miền Nam nên thử', '#e6e2dd', '#4f6f58', 3072, 7],
    ['Cách bảo quản rau xanh được lâu trong tủ lạnh', '#bfd3c3', '#3d5c47', 2048, 11],
    ['Bánh mì chay pate nấm cho bữa sáng', '#ebc3ab', '#94532f', 3072, 16],
  ].map(([title, background, accent, authorId, votes], index): MockPost => ({
    postId: 90 + index,
    authorId: authorId as number,
    title: title as string,
    content: `${title}. Đây là bài viết mẫu để thử danh sách, tìm kiếm và phân trang của trang Cộng đồng.`,
    imageUrl: index % 3 === 2 ? null : cover(background as string, accent as string),
    visibility: 'PUBLIC',
    status: 'APPROVED_ACTIVE',
    baseVotes: votes as number,
    createdAt: hoursAgo(80 + index * 12),
    videos: [],
    recipes: [],
  })),
];

export const comments: MockComment[] = [
  { commentId: 301, postId: 77, authorId: 2048, parentCommentId: null, content: 'Bài viết rất hữu ích, mình cũng đang bắt đầu ăn chay!', status: 'ACTIVE', isSoftDeleted: false, createdAt: hoursAgo(4) },
  { commentId: 302, postId: 77, authorId: 1024, parentCommentId: 301, content: 'Cảm ơn bạn, cố lên nhé!', status: 'ACTIVE', isSoftDeleted: false, createdAt: hoursAgo(3.5) },
  { commentId: 303, postId: 77, authorId: 3072, parentCommentId: 302, content: 'Mình góp thêm: nên ăn thêm đậu lăng để đủ sắt.', status: 'ACTIVE', isSoftDeleted: false, createdAt: hoursAgo(3) },
  { commentId: 304, postId: 77, authorId: 3072, parentCommentId: null, content: 'Canh nấm đậu phụ rong biển là món mình nấu mỗi tuần.', status: 'ACTIVE', isSoftDeleted: false, createdAt: hoursAgo(2) },
  { commentId: 305, postId: 78, authorId: 3072, parentCommentId: null, content: 'Thêm vài lát lê vào nồi nước dùng cũng rất ngọt.', status: 'ACTIVE', isSoftDeleted: false, createdAt: hoursAgo(10) },
];

// --- Video & bản phiên âm (SCR-21) ---

/** Video mẫu công khai của Cloudinary (nơi lưu video thật của dự án). */
const SAMPLE_VIDEO_URL = 'https://res.cloudinary.com/demo/video/upload/samples/cld-sample-video.mp4';

const SEED_VIDEOS: (MockVideo & { postId: number })[] = [
  { postId: 77, videoId: 901, title: 'Canh nấm đậu phụ rong biển', durationSeconds: 185, status: 'READY', videoUrl: SAMPLE_VIDEO_URL, thumbnailUrl: cover('#dfeadf', '#4f6f58') },
  { postId: 78, videoId: 902, title: 'Nước dùng chay ngọt thanh', durationSeconds: 240, status: 'READY', videoUrl: SAMPLE_VIDEO_URL, thumbnailUrl: cover('#f8e3d6', '#94532f') },
  { postId: 81, videoId: 903, title: 'Nấm đùi gà xào sả ớt', durationSeconds: 95, status: 'READY', videoUrl: SAMPLE_VIDEO_URL, thumbnailUrl: cover('#f1ede8', '#7a4429') },
  { postId: 80, videoId: 904, title: 'Cơm gạo lứt đậu hũ sốt cà', durationSeconds: 150, status: 'READY', videoUrl: SAMPLE_VIDEO_URL, thumbnailUrl: cover('#e8e6df', '#636a60') },
  { postId: 79, videoId: 905, title: 'Bữa sáng giàu đạm cho người ăn chay', durationSeconds: 60, status: 'PROCESSING', videoUrl: SAMPLE_VIDEO_URL },
  { postId: 90, videoId: 906, title: 'Sữa hạt điều tại nhà', durationSeconds: 120, status: 'READY', videoUrl: SAMPLE_VIDEO_URL, thumbnailUrl: cover('#f8e3d6', '#bd7653') },
];
for (const { postId, ...video } of SEED_VIDEOS) posts.find((post) => post.postId === postId)?.videos.push(video);

const CANH_NAM: Pick<MockTranscript, 'rawTranscript' | 'extractedRecipe'> = {
  rawTranscript:
    'Xin chào mọi người, hôm nay mình nấu canh nấm đậu phụ rong biển cho bữa tối. Nguyên liệu gồm 200 gam nấm rơm, một bìa đậu phụ non khoảng 300 gam, 10 gam rong biển khô và một lít nước dùng rau củ. Đầu tiên ngâm rong biển với nước ấm khoảng 10 phút rồi vắt ráo. Nấm rơm rửa sạch, cắt đôi. Đậu phụ cắt khối vuông vừa ăn. Đun sôi nước dùng, cho nấm vào nấu 5 phút. Tiếp theo thả đậu phụ và rong biển, nêm một thìa cà phê muối và nửa thìa cà phê đường. Nấu thêm 3 phút là tắt bếp, rắc chút tiêu và rau mùi lên trên. Vậy là xong món canh thanh mát, chúc mọi người ngon miệng!',
  extractedRecipe: {
    title: 'Canh nấm đậu phụ rong biển',
    ingredients: [
      { name: 'Nấm rơm', quantity: 200, unit: 'g' },
      { name: 'Đậu phụ non', quantity: 300, unit: 'g' },
      { name: 'Rong biển khô', quantity: 10, unit: 'g' },
      { name: 'Nước dùng rau củ', quantity: 1, unit: 'lít' },
      { name: 'Muối', quantity: 1, unit: 'thìa cà phê' },
      { name: 'Đường', quantity: 0.5, unit: 'thìa cà phê' },
    ],
    steps: [
      'Ngâm rong biển với nước ấm khoảng 10 phút rồi vắt ráo.',
      'Rửa sạch nấm rơm, cắt đôi; cắt đậu phụ thành khối vuông vừa ăn.',
      'Đun sôi nước dùng, cho nấm vào nấu 5 phút.',
      'Thả đậu phụ và rong biển, nêm muối và đường, nấu thêm 3 phút.',
      'Tắt bếp, rắc tiêu và rau mùi trước khi dùng.',
    ],
  },
};

const NUOC_DUNG: Pick<MockTranscript, 'rawTranscript' | 'extractedRecipe'> = {
  rawTranscript:
    'Chào cả nhà, mình chia sẻ cách nấu nước dùng chay ngọt thanh. Mình dùng một củ cải trắng khoảng 500 gam, hai trái bắp ngọt và 30 gam nấm hương khô. Củ cải gọt vỏ cắt khúc, bắp cắt khoanh, nấm hương ngâm cho mềm. Cho tất cả vào nồi với hai lít rưỡi nước, hầm lửa nhỏ khoảng 90 phút. Trong lúc hầm nhớ vớt bọt thường xuyên để nước trong. Cuối cùng nêm 20 gam đường phèn và một chút muối. Nước dùng này nấu phở chay hay bún chay đều rất ngon.',
  extractedRecipe: {
    title: 'Nước dùng chay ngọt thanh',
    ingredients: [
      { name: 'Củ cải trắng', quantity: 500, unit: 'g' },
      { name: 'Bắp ngọt', quantity: 2, unit: 'trái' },
      { name: 'Nấm hương khô', quantity: 30, unit: 'g' },
      { name: 'Nước', quantity: 2.5, unit: 'lít' },
      { name: 'Đường phèn', quantity: 20, unit: 'g' },
    ],
    steps: [
      'Gọt vỏ củ cải, cắt khúc; cắt bắp thành khoanh; ngâm nấm hương cho mềm.',
      'Cho nguyên liệu vào nồi cùng 2,5 lít nước, hầm lửa nhỏ khoảng 90 phút.',
      'Vớt bọt thường xuyên trong lúc hầm để nước trong.',
      'Nêm đường phèn và chút muối cho vừa ăn.',
    ],
  },
};

const NAM_XAO: Pick<MockTranscript, 'rawTranscript' | 'extractedRecipe'> = {
  rawTranscript:
    'Hôm nay mình làm món nấm đùi gà xào sả ớt. Cần 300 gam nấm đùi gà, ba cây sả, một trái ớt và hai thìa canh nước tương. Nấm xé sợi, sả băm nhỏ, ớt cắt lát. Phi thơm sả ớt với một thìa dầu, cho nấm vào xào lửa lớn khoảng 5 phút. Nêm nước tương và một chút đường, đảo đều thêm 2 phút. Món này ăn với cơm trắng rất hao cơm!',
  extractedRecipe: {
    title: 'Nấm đùi gà xào sả ớt',
    ingredients: [
      { name: 'Nấm đùi gà', quantity: 300, unit: 'g' },
      { name: 'Sả', quantity: 3, unit: 'cây' },
      { name: 'Ớt', quantity: 1, unit: 'trái' },
      { name: 'Nước tương', quantity: 2, unit: 'thìa canh' },
    ],
    steps: [
      'Xé nấm thành sợi, băm nhỏ sả, cắt ớt thành lát.',
      'Phi thơm sả và ớt với một thìa dầu.',
      'Cho nấm vào xào lửa lớn khoảng 5 phút.',
      'Nêm nước tương và chút đường, đảo đều thêm 2 phút.',
    ],
  },
};

const COM_GAO_LUT: Pick<MockTranscript, 'rawTranscript' | 'extractedRecipe'> = {
  rawTranscript:
    'Bữa trưa hôm nay là cơm gạo lứt với đậu hũ sốt cà chua. Mình dùng hai bìa đậu hũ, ba trái cà chua chín và một chén cơm gạo lứt. Đậu hũ cắt miếng rồi chiên vàng các mặt. Cà chua băm nhuyễn, xào với chút dầu cho ra màu đỏ đẹp. Cho đậu hũ vào rim với sốt cà khoảng 7 phút, nêm nước tương và hạt nêm chay. Dọn ra ăn cùng cơm gạo lứt nóng.',
  extractedRecipe: {
    title: 'Cơm gạo lứt đậu hũ sốt cà',
    ingredients: [
      { name: 'Đậu hũ', quantity: 2, unit: 'bìa' },
      { name: 'Cà chua', quantity: 3, unit: 'trái' },
      { name: 'Cơm gạo lứt', quantity: 1, unit: 'chén' },
    ],
    steps: [
      'Cắt đậu hũ thành miếng, chiên vàng các mặt.',
      'Băm nhuyễn cà chua, xào với chút dầu đến khi ra màu.',
      'Cho đậu hũ vào rim với sốt cà khoảng 7 phút, nêm nước tương và hạt nêm chay.',
      'Dọn ra ăn cùng cơm gạo lứt nóng.',
    ],
  },
};

const SUA_HAT_DIEU: Pick<MockTranscript, 'rawTranscript' | 'extractedRecipe'> = {
  rawTranscript:
    'Mình hướng dẫn làm sữa hạt điều tại nhà chỉ với ba bước. Chuẩn bị 100 gam hạt điều sống và một lít nước lọc. Bước một, ngâm hạt điều khoảng 4 tiếng rồi rửa lại. Bước hai, xay hạt điều với nước thật mịn. Bước ba, lọc qua túi vải, thêm hai quả chà là nếu thích ngọt. Sữa để tủ lạnh dùng trong hai ngày.',
  extractedRecipe: {
    title: 'Sữa hạt điều',
    ingredients: [
      { name: 'Hạt điều sống', quantity: 100, unit: 'g' },
      { name: 'Nước lọc', quantity: 1, unit: 'lít' },
      { name: 'Chà là', quantity: 2, unit: 'quả' },
    ],
    steps: [
      'Ngâm hạt điều khoảng 4 tiếng rồi rửa lại.',
      'Xay hạt điều với nước đến khi thật mịn.',
      'Lọc qua túi vải, thêm chà là nếu thích ngọt; bảo quản lạnh, dùng trong 2 ngày.',
    ],
  },
};

/** Kết quả cố định cho video tải lên trong phiên (thay cho Whisper + Gemini). */
export const UPLOADED_VIDEO_TRANSCRIPT = CANH_NAM;

export const transcripts: MockTranscript[] = [
  { videoId: 901, status: 'COMPLETED', recipeApproved: true, ...CANH_NAM },
  { videoId: 902, status: 'COMPLETED', recipeApproved: false, ...NUOC_DUNG },
  // Đang bóc tách: xong sau 45 giây kể từ lúc mở app (bản thật mất 2–3 phút).
  { videoId: 903, status: 'PENDING', readyAt: Date.now() + 45 * 1000, recipeApproved: false, ...NAM_XAO },
  // Thất bại: lần bóc tách lại đầu tiên trả 503, lần sau mới nhận.
  { videoId: 904, status: 'FAILED', recipeApproved: false, circuitOpenTimes: 1, ...COM_GAO_LUT },
  { videoId: 906, status: 'COMPLETED', recipeApproved: true, ...SUA_HAT_DIEU },
];

/** `${userId}:${postId}` của các lượt thả tim do người dùng giả tạo trong phiên. */
export const votes = new Set<string>();
export const reports: MockReport[] = [];
/** Lần bình luận gần nhất theo userId, để mô phỏng giãn cách 15 giây (BR-USR-04). */
export const lastCommentAt = new Map<number, number>();

const counters = { post: 200, comment: 1000, report: 1, video: 1000 };
export const nextId = (key: keyof typeof counters) => counters[key]++;
