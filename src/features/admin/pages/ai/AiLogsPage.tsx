import React from 'react';
import { LlmopsLogTable } from '../../components/LlmopsLogTable';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { vnDate } from '../../lib/llmops';

const DEFAULT_DAYS = 30;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Trang Nhật ký cuộc gọi AI (LLMOps Logs · `/admin/ai/logs`).
 * Bố cục toàn màn hình thoáng đãng giúp Admin và Kỹ sư AI dễ dàng tra cứu, kiểm tra prompt, response, latency và trace ID.
 */
export const AiLogsPage: React.FC = () => {
  const { get } = useUrlFilters();
  const today = vnDate();
  const from = ISO_DATE.test(get('from')) ? get('from') : vnDate(DEFAULT_DAYS - 1);
  const to = ISO_DATE.test(get('to')) ? get('to') : today;

  return (
    <div className="flex flex-col gap-space-lg">
      <LlmopsLogTable from={from} to={to} />
    </div>
  );
};

export default AiLogsPage;
