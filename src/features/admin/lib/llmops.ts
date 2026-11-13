import type { CostPoint } from '../types/admin.types';
import { FEATURE_LABEL } from './labels';

// Gom series của GET /admin/llmops/dashboard thành dữ liệu vẽ biểu đồ. Không làm tròn hay bịa điểm: mỗi ô là tổng
// đúng các điểm Backend trả cho (ngày, tính năng), để biểu đồ và bảng số liệu khớp dữ liệu Backend.

/** Thứ tự tính năng cố định = thứ tự màu; màu đi theo tính năng, không theo thứ hạng (lọc không đổi màu). */
export const FEATURE_ORDER = Object.keys(FEATURE_LABEL);

/** Tính năng ngoài danh sách docs/10 gộp vào "Khác" thay vì sinh thêm màu. */
export const OTHER_FEATURE = 'OTHER';
/** Backend gộp theo ngày (groupBy=DAY) có thể không trả `feature`. */
export const ALL_FEATURES = 'ALL';
/** Backend gộp theo tính năng (groupBy=FEATURE) có thể không trả `date`. */
export const NO_DATE = '';

/** Bảng màu phân loại 7 slot đã kiểm tra mù màu (dataviz validate_palette: PASS trên nền #ffffff). */
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
const OTHER_COLOR = '#8a8f86';

export function featureColor(feature: string): string {
  if (feature === ALL_FEATURES) return SERIES_COLORS[0];
  const index = FEATURE_ORDER.indexOf(feature);
  return index >= 0 ? SERIES_COLORS[index] : OTHER_COLOR;
}

export interface CostCell {
  costUsd: number;
  tokens: number;
  promptTokens?: number;
  completionTokens?: number;
}

export interface CostMatrix {
  /** Ngày tăng dần (YYYY-MM-DD); `[NO_DATE]` nếu Backend không trả ngày. */
  dates: string[];
  /** Tính năng có dữ liệu, theo FEATURE_ORDER, "Khác" ở cuối. */
  features: string[];
  cells: Record<string, Record<string, CostCell>>;
  dayTotals: Record<string, CostCell>;
  featureTotals: Record<string, CostCell>;
  total: CostCell;
  maxDayCost: number;
}

const normalizeFeature = (feature: string | null | undefined) =>
  !feature ? ALL_FEATURES : FEATURE_ORDER.includes(feature) ? feature : OTHER_FEATURE;

const add = (a: CostCell | undefined, b: CostCell): CostCell => ({
  costUsd: (a?.costUsd ?? 0) + b.costUsd,
  tokens: (a?.tokens ?? 0) + b.tokens,
});

export function buildCostMatrix(series: CostPoint[]): CostMatrix {
  const cells: CostMatrix['cells'] = {};
  const dayTotals: CostMatrix['dayTotals'] = {};
  const featureTotals: CostMatrix['featureTotals'] = {};
  let total: CostCell = { costUsd: 0, tokens: 0 };

  for (const point of series) {
    const date = point.date ?? NO_DATE;
    const feature = normalizeFeature(point.feature);
    const value = { costUsd: Number(point.costUsd) || 0, tokens: Number(point.tokens) || 0 };
    cells[date] = { ...cells[date], [feature]: add(cells[date]?.[feature], value) };
    dayTotals[date] = add(dayTotals[date], value);
    featureTotals[feature] = add(featureTotals[feature], value);
    total = add(total, value);
  }

  const rank = (feature: string) =>
    feature === ALL_FEATURES ? -1 : feature === OTHER_FEATURE ? FEATURE_ORDER.length : FEATURE_ORDER.indexOf(feature);
  const features = Object.keys(featureTotals).sort((a, b) => rank(a) - rank(b));
  const dates = Object.keys(dayTotals).sort();

  return {
    dates,
    features,
    cells,
    dayTotals,
    featureTotals,
    total,
    maxDayCost: Math.max(0, ...Object.values(dayTotals).map((cell) => cell.costUsd)),
  };
}

/** Ngưỡng BR-ADM-AI-001: ≥ 80% ngân sách ngày cảnh báo khẩn, ≥ 100% hạ tải sang cache/mô hình nội bộ. */
export type BudgetLevel = 'ok' | 'warning' | 'throttled';

export function budgetLevel(usagePercent: number): BudgetLevel {
  if (usagePercent >= 100) return 'throttled';
  if (usagePercent >= 80) return 'warning';
  return 'ok';
}

/** Trục y: mốc tròn (1, 2, 2.5, 5 × 10^n), khoảng 4 vạch. */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
  const ticks: number[] = [];
  for (let value = 0; value < max + step / 2; value += step) ticks.push(Number(value.toFixed(10)));
  if (ticks[ticks.length - 1] < max) ticks.push(Number((ticks[ticks.length - 1] + step).toFixed(10)));
  return ticks;
}

/** "$12,4" / "$0,0123": đủ chữ số có nghĩa cho chi phí nhỏ, kiểu số vi-VN. */
export function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const digits = abs === 0 ? 0 : abs >= 100 ? 0 : abs >= 1 ? 2 : abs >= 0.01 ? 3 : 4;
  return `$${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value)}`;
}

/** Tỷ giá quy đổi tham khảo để hiển thị chi phí ước tính bằng VND (Backend chỉ lưu USD — AIQuotaLogs.Cost_Estimate_USD). */
export const USD_TO_VND_RATE = 26000;

/** 0,0123 USD → "≈ 320 ₫"; chi phí nhỏ dưới 1 ₫ hiện "< 1 ₫". */
export function formatVnd(usd: number, rate: number = USD_TO_VND_RATE): string {
  const vnd = usd * rate;
  if (vnd > 0 && vnd < 1) return '< 1 ₫';
  return `≈ ${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(vnd)} ₫`;
}

/** Bảng số liệu: giữ tới 4 chữ số thập phân như Backend trả, không làm tròn theo độ lớn. */
export const formatUsdExact = (value: number) =>
  `$${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value)}`;

/** 1 234 567 → "1,2 Tr" cho token; số nhỏ giữ nguyên. */
export function formatTokens(value: number): string {
  return new Intl.NumberFormat('vi-VN', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

/** "2026-10-05" → "05/10". */
export const shortDate = (date: string) => (date ? `${date.slice(8, 10)}/${date.slice(5, 7)}` : 'Cả kỳ');

/** "2026-10-05" → "05/10/2026". */
export const fullDate = (date: string) => (date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : 'Cả kỳ');

/** Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD), lùi `daysBack` ngày. */
export function vnDate(daysBack = 0, now: Date = new Date()): string {
  const date = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(date);
}
