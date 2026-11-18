import React from 'react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { featureLabel } from '../lib/labels';
import { featureColor, formatTokens, formatUsd, formatVnd, type CostMatrix } from '../lib/llmops';
import { CARD } from './AdminUi';

/** Ba tính năng AI chính cần báo cáo chi phí riêng (LLMOps): Chat Trợ lý, Quét tủ lạnh, Tạo thực đơn. */
export const KEY_AI_FEATURES = ['AI_CHAT', 'AI_FRIDGE', 'MEAL_PLAN_GEN'] as const;

/** Thẻ chi phí ước tính (USD kèm VND) và token trong kỳ của từng tính năng AI chính. */
export const FeatureCostCards: React.FC<{ matrix: CostMatrix }> = ({ matrix }) => (
  <section aria-label="Chi phí và token theo tính năng" className="grid gap-space-md sm:grid-cols-3">
    {KEY_AI_FEATURES.map((feature) => {
      const cell = matrix.featureTotals[feature] ?? { costUsd: 0, tokens: 0 };
      return (
        <div key={feature} data-testid={`feature-cost-${feature}`} className={cn(CARD, 'flex flex-col gap-1 p-space-md')}>
          <p className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: featureColor(feature) }} aria-hidden />
            {featureLabel(feature)}
          </p>
          <p className="font-headline-sm text-headline-sm text-on-surface">{formatUsd(cell.costUsd)}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{formatVnd(cell.costUsd)}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant" title={`${formatNumber(cell.tokens)} token`}>
            {formatTokens(cell.tokens)} token
          </p>
        </div>
      );
    })}
  </section>
);
