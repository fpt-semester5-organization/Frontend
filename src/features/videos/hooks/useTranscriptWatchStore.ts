import { create } from 'zustand';
import { useAuthStore } from '@/stores/auth.store';

/** Video tác giả vừa đăng và đang chờ kết quả bóc tách công thức. */
export interface TranscriptWatch {
  videoId: number;
  postId: number;
  /** Chủ video: đổi tài khoản thì không báo nhầm người. */
  userId: number;
  title?: string;
  /** Mốc dừng theo dõi (ms). */
  until: number;
}

/** Ngừng theo dõi sau 15 phút (bình thường xong trong 2–3 phút). */
const WATCH_LIMIT_MS = 15 * 60 * 1000;
const STORAGE_KEY = 'vl_transcript_watches';

// Lưu trong sessionStorage để tải lại trang vẫn tiếp tục theo dõi; trình duyệt chặn lưu trữ thì chỉ giữ trong bộ nhớ.
function load(): TranscriptWatch[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as TranscriptWatch[]).filter((watch) => watch.until > Date.now()) : [];
  } catch {
    return [];
  }
}

function save(watches: TranscriptWatch[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(watches));
  } catch {
    // Bỏ qua: không lưu được thì vẫn theo dõi trong phiên hiện tại.
  }
}

interface TranscriptWatchState {
  watches: TranscriptWatch[];
  add: (watch: Omit<TranscriptWatch, 'until' | 'userId'>) => void;
  remove: (videoId: number) => void;
}

export const useTranscriptWatchStore = create<TranscriptWatchState>((set, get) => ({
  watches: load(),
  add: (watch) => {
    const userId = useAuthStore.getState().user?.userId;
    if (!userId) return;
    const next = [
      ...get().watches.filter((item) => item.videoId !== watch.videoId),
      { ...watch, userId, until: Date.now() + WATCH_LIMIT_MS },
    ];
    save(next);
    set({ watches: next });
  },
  remove: (videoId) => {
    const next = get().watches.filter((item) => item.videoId !== videoId);
    save(next);
    set({ watches: next });
  },
}));

/** Gọi sau khi tác giả tải video lên (POST /videos trả videoId): báo khi bóc tách xong. */
export const watchVideoTranscript = (watch: Omit<TranscriptWatch, 'until' | 'userId'>) =>
  useTranscriptWatchStore.getState().add(watch);
