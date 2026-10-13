import { useGuestStore, type GuestQuota } from '@/stores/guest.store';

type Counter = { limit: number; used: number; remaining: number };
type PartialQuota = Partial<Pick<GuestQuota, 'ai' | 'barcodeDaily' | 'mapSearch'>>;

const isCounter = (q: unknown): q is Counter => {
  const c = q as Partial<Counter> | null | undefined;
  return !!c && typeof c.limit === 'number' && typeof c.used === 'number' && typeof c.remaining === 'number';
};

/**
 * Gộp quota do server trả về (chat/vision/barcode/venues) vào store Khách.
 * Nếu không phải Khách (Thành viên), bỏ qua.
 */
export function mergeGuestQuota(patch: PartialQuota, isGuest: boolean): void {
  if (!isGuest) return;
  const store = useGuestStore.getState();
  const cur = store.quota;
  const next: GuestQuota = {
    ai: cur?.ai ?? { limit: 3, used: 0, remaining: 3 },
    barcodeDaily: cur?.barcodeDaily ?? { limit: 3, used: 0, remaining: 3 },
    mapSearch: cur?.mapSearch ?? { limit: 3, used: 0, remaining: 3 },
    resetAt: cur?.resetAt,
  };
  if (isCounter(patch.ai)) next.ai = patch.ai;
  if (isCounter(patch.barcodeDaily)) next.barcodeDaily = patch.barcodeDaily;
  if (isCounter(patch.mapSearch)) next.mapSearch = patch.mapSearch;
  store.setQuota(next);
}

export type { Counter as QuotaCounter };
