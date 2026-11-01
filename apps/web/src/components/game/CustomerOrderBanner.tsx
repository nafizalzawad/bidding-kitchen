import React from 'react';
import type { AwardedIngredient, CustomerOrder } from '@bidding-kitchen/shared';
import { evaluateCustomerOrder } from '@bidding-kitchen/shared';
import { Sparkles, Utensils, CheckCircle2 } from 'lucide-react';

export interface CustomerOrderBannerProps {
  order: CustomerOrder | null | undefined;
  dish: AwardedIngredient[];
  className?: string;
}

/**
 * CustomerOrderBanner displays the player's secret customer order objective.
 * Shows real-time completion status (+5 bonus points when requirements met).
 */
export const CustomerOrderBanner: React.FC<CustomerOrderBannerProps> = ({
  order,
  dish,
  className = '',
}) => {
  if (!order) return null;

  const result = evaluateCustomerOrder(order, dish);
  const isComplete = result.completed;

  // Count satisfied required tags for progress indicator
  const acquiredTags = dish.flatMap((d) => d?.ingredient?.tags ?? []);
  const requiredTags = order.requiredTags ?? [];
  const satisfiedTagsCount = requiredTags.filter((tag) => acquiredTags.includes(tag)).length;

  return (
    <div
      data-testid="customer-order-banner"
      className={`relative w-full rounded-2xl border-2 px-3.5 py-2.5 transition-all duration-300 shadow-sm ${
        isComplete
          ? 'bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] border-[#F59E0B] shadow-[0_3px_0_#D97706]'
          : 'bg-[#FFFDF7] border-[#1E1B18] shadow-[0_2px_0_#1E1B18]'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border-1.5 border-[#1E1B18] ${
              isComplete ? 'bg-[#F59E0B] text-white animate-pulse' : 'bg-[#E5A65E]/30 text-[#1E1B18]'
            }`}
          >
            {isComplete ? <Sparkles className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#57514A]">
                Secret Order
              </span>
              <span className="text-xs font-black text-[#1E1B18] truncate">
                {order.title}
              </span>
            </div>
            <p className="text-[11px] text-[#57514A] leading-tight line-clamp-1">
              {order.description}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          {isComplete ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981] border border-[#047857] text-white text-[11px] font-black shadow-xs">
              <CheckCircle2 className="w-3 h-3" />
              <span>+5 PTS</span>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <span className="px-1.5 py-0.5 rounded-md bg-[#1E1B18]/10 text-[10px] font-bold text-[#1E1B18]">
                {requiredTags.length > 0 ? `${satisfiedTagsCount}/${requiredTags.length} tags` : '+5 pts if complete'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
