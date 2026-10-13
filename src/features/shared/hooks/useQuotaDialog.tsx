import { useCallback, useState } from 'react';
import { selectIsVip, useAuthStore } from '@/stores/auth.store';
import { useGuestStore } from '@/stores/guest.store';
import { useUiStore } from '@/stores/ui.store';
import { QUOTA } from '@/constants/quota';
import { mergeGuestQuota } from '../lib/guestQuota';
import { QuotaDialog, type QuotaDialogState } from '../components/QuotaDialog';
import { isQuotaCode, toProblem } from '../lib/problem';

/**
 * Xử lý `ERR_QUOTA_*` / `ERR_VIP_REQUIRED` theo bậc:
 *  - Khách: http.ts đã mở SignupPromptModal → chỉ trả `true`;
 *  - Thành viên Free: đóng popup đăng ký của Khách, mở hộp mời nâng cấp VIP;
 *  - VIP / hạn mức áp dụng cả hai gói (đổi món): chỉ thông báo.
 * Trả về `true` nếu lỗi là lỗi hạn mức (đã xử lý), để trang không hiện thêm lỗi chung.
 */
export function useQuotaDialog() {
  const [state, setState] = useState<QuotaDialogState | null>(null);

  const handle = useCallback((err: unknown): boolean => {
    const p = toProblem(err);
    if (!isQuotaCode(p.code)) return false;
    const { user } = useAuthStore.getState();
    if (!user) {
      // Khách: http.ts đã mở popup đăng ký; đồng bộ huy hiệu hạn mức về 0 (403 không kèm `quota`).
      const q = useGuestStore.getState().quota;
      const zero = (cur: { limit: number } | undefined, dflt: number) => ({ limit: cur?.limit ?? dflt, used: cur?.limit ?? dflt, remaining: 0 });
      if (p.code === 'ERR_QUOTA_AI_EXCEEDED') mergeGuestQuota({ ai: zero(q?.ai, QUOTA.guest.ai) }, true);
      else if (p.code === 'ERR_QUOTA_BARCODE_EXCEEDED') mergeGuestQuota({ barcodeDaily: zero(q?.barcodeDaily, QUOTA.guest.barcodeDaily) }, true);
      else if (p.code === 'ERR_QUOTA_MAP_EXCEEDED') mergeGuestQuota({ mapSearch: zero(q?.mapSearch, QUOTA.guest.mapSearch) }, true);
      return true;
    }
    useUiStore.getState().closeSignupPrompt();
    const vip = selectIsVip(useAuthStore.getState());
    const offer = !vip && p.code !== 'ERR_QUOTA_MEAL_SWAP_EXCEEDED' ? 'upgrade' : 'none';
    setState({ code: p.code, message: p.message, offer });
    return true;
  }, []);

  /** Mở hộp mời nâng cấp chủ động (vd. Free bấm tính năng VIP trước khi gọi API). */
  const open = useCallback((code: string, message: string) => {
    const vip = selectIsVip(useAuthStore.getState());
    setState({ code, message, offer: vip ? 'none' : 'upgrade' });
  }, []);

  const dialog = <QuotaDialog state={state} onClose={() => setState(null)} />;
  return { handle, open, dialog, close: () => setState(null) };
}
