import { create } from 'zustand';

/** Hạn mức dùng thử còn lại của Khách (GET /guest/quota). Server là nguồn sự thật; store chỉ để hiển thị. */
export interface GuestQuota {
  ai: { limit: number; used: number; remaining: number };
  barcodeDaily: { limit: number; used: number; remaining: number };
  mapSearch: { limit: number; used: number; remaining: number };
  resetAt?: string;
}

interface GuestState {
  guestId: string | null;
  quota: GuestQuota | null;
  setGuest: (guestId: string) => void;
  setQuota: (quota: GuestQuota) => void;
  reset: () => void;
}

export const useGuestStore = create<GuestState>((set) => ({
  guestId: null,
  quota: null,
  setGuest: (guestId) => set({ guestId }),
  setQuota: (quota) => set({ quota }),
  reset: () => set({ guestId: null, quota: null }),
}));
