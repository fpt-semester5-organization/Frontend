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
  status: 'PROCESSING' | 'READY' | 'FAILED' | 'BANNED';
  title?: string;
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

/** `${userId}:${postId}` của các lượt thả tim do người dùng giả tạo trong phiên. */
export const votes = new Set<string>();
export const reports: MockReport[] = [];
/** Lần bình luận gần nhất theo userId, để mô phỏng giãn cách 15 giây (BR-USR-04). */
export const lastCommentAt = new Map<number, number>();

const counters = { post: 200, comment: 1000, report: 1, video: 1, chatSession: 50, chatMessage: 500, survey: 100 };
export const nextId = (key: keyof typeof counters) => counters[key]++;

export interface MockChatSession {
  sessionId: number;
  userId: number | null;
  guestUuid: string | null;
  title: string;
  contextType: string;
  startedAt: string;
  updatedAt: string;
}

export interface MockChatMessage {
  messageId: number;
  sessionId: number;
  senderType: 'USER' | 'ASSISTANT';
  content: string;
  disclaimer?: string | null;
  sources?: { type: string; id: number; title: string }[];
  ragUsed?: boolean;
  recommendedRecipes?: { recipeId: number; title: string; cookTimeMinutes?: number | null }[];
  createdAt: string;
}

export interface MockSurvey {
  surveyId: number;
  chatSessionId?: number;
  userId: number;
  contextQuestion: string;
  ratingScore: number;
  feedbackContent?: string;
  createdAt: string;
}

export const chatSessions: MockChatSession[] = [
  {
    sessionId: 1,
    userId: 1024,
    guestUuid: null,
    title: 'Tối ưu 75g đạm thực vật mỗi ngày',
    contextType: 'NUTRITION_CONSULTATION',
    startedAt: hoursAgo(24),
    updatedAt: hoursAgo(2),
  },
  {
    sessionId: 2,
    userId: 1024,
    guestUuid: null,
    title: 'Cân bằng dinh dưỡng bữa tối dưỡng sinh',
    contextType: 'NUTRITION_CONSULTATION',
    startedAt: hoursAgo(48),
    updatedAt: hoursAgo(20),
  },
  {
    sessionId: 3,
    userId: 1024,
    guestUuid: null,
    title: 'Gợi ý món chay từ đậu phụ và nấm',
    contextType: 'NUTRITION_CONSULTATION',
    startedAt: hoursAgo(72),
    updatedAt: hoursAgo(50),
  },
];

export const chatMessages: MockChatMessage[] = [
  {
    messageId: 101,
    sessionId: 1,
    senderType: 'USER',
    content: 'Tôi ăn thuần chay trường và tập thể thao 4 buổi/tuần, làm sao đảm bảo 75g đạm mỗi ngày mà không bị đầy hơi chướng bụng?',
    createdAt: hoursAgo(2),
  },
  {
    messageId: 102,
    sessionId: 1,
    senderType: 'ASSISTANT',
    content: 'Chào bạn, để nạp đủ 75g đạm/ngày mà không sinh khí chướng bụng, giải pháp cốt lõi là phân tách nhỏ 4 nguồn đạm đã kích hoạt enzyme & lên men vi sinh: Đậu gà kết hợp Kombu [S1], hạt gai dầu & yến mạch [S2], tempeh lên men vi sinh và nấm hầu thủ.\n\nBạn có thể thử làm món Canh nấm đậu phụ rong biển [S1] hoặc Tempeh áp chảo để hỗ trợ tiêu hóa tốt nhất.',
    disclaimer: 'Khuyến nghị mang tính chất tham khảo dinh dưỡng, vui lòng tham vấn ý kiến bác sĩ chuyên khoa đối với các bệnh lý nền.',
    sources: [
      { type: 'RECIPE', id: 512, title: 'Canh nấm đậu phụ rong biển' },
      { type: 'NUTRITION_DOC', id: 10, title: 'Cẩm nang dinh dưỡng thực vật (WHO & Viện Dinh Dưỡng)' },
    ],
    ragUsed: true,
    recommendedRecipes: [
      { recipeId: 512, title: 'Canh nấm đậu phụ rong biển', cookTimeMinutes: 25 },
    ],
    createdAt: hoursAgo(1.9),
  },
];

export const surveys: MockSurvey[] = [];

