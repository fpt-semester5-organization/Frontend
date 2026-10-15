import { useMutation } from '@tanstack/react-query';
import { exportMealPlanPdf } from '../api/mealPlans.api';

/** Tải tệp PDF về máy bằng một liên kết tạm (tệp không lưu trên máy chủ, FN-MEAL-08). */
function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** GET /meal-plans/{id}/export (VIP): xuất thực đơn và (nếu có) danh sách đi chợ ra PDF. */
export function useExportPdf(planId: number) {
  return useMutation({
    mutationFn: (include: 'PLAN' | 'PLAN,SHOPPING') => exportMealPlanPdf(planId, include),
    onSuccess: (blob) => saveBlob(blob, `veggielife-thuc-don-${planId}.pdf`),
  });
}
