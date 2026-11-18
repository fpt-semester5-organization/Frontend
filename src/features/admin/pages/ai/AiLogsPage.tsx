import React from 'react';
import { useLocation } from 'react-router-dom';
import { AiCostSection } from '../../components/AiCostSection';
import { AiDateRangeFilter, AiSectionJumpNav } from '../../components/AiDateRangeFilter';
import { useAiDateRange, useScrollToHash } from '../../hooks/useAiDateRange';
import { LlmopsLogTable } from '../../components/LlmopsLogTable';

const SECTIONS = [
  { id: 'cost', label: 'Phân tích Chi phí', icon: 'analytics' },
  { id: 'logs', label: 'Nhật ký truy vấn', icon: 'receipt_long' },
];

/**
 * Trang Chi phí & Nhật ký API AI (`/admin/ai/logs`).
 * Một thanh lọc khoảng ngày dùng chung cho phần Phân tích Chi phí (`#cost`) và bảng Nhật ký truy vấn (`#logs`).
 */
export const AiLogsPage: React.FC = () => {
  const { from, to } = useAiDateRange();
  const { hash } = useLocation();
  useScrollToHash(hash);

  return (
    <div className="flex flex-col gap-space-lg">
      <AiDateRangeFilter />
      <AiSectionJumpNav items={SECTIONS} />
      <AiCostSection from={from} to={to} />
      <section id="logs" aria-label="Nhật ký truy vấn API AI" className="scroll-mt-24">
        <LlmopsLogTable from={from} to={to} />
      </section>
    </div>
  );
};

export default AiLogsPage;
