import React from 'react';
import { motion } from 'framer-motion';
import type { Ingredient } from '@bidding-kitchen/shared';
import { IngredientArt } from './IngredientArt.js';
import { TagPill } from '../ui/TagPill.js';
import { Sparkles, AlertCircle } from 'lucide-react';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';

export interface IngredientCardProps {
  ingredient: Ingredient;
  index?: number;
  selected?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onSelect?: (ingredient: Ingredient) => void;
  className?: string;
}

export const IngredientCard: React.FC<IngredientCardProps> = ({
  ingredient,
  index = 0,
  selected = false,
  disabled = false,
  disabledReason,
  onSelect,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();

  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect(ingredient);
    }
  };

  const isBasic = ingredient.isBasic;
  const isScarce = ingredient.stock === 1;

  const tagsText = ingredient.tags.length > 0 ? `, Tags: ${ingredient.tags.join(', ')}` : '';
  const priceText = isBasic ? 'Free ($0)' : `$${ingredient.basePrice} base price`;
  const stockText = isScarce ? ', Only 1 remaining' : '';
  const ariaLabel = `${ingredient.name}, ${priceText}, ${ingredient.tasteScore} taste points${tagsText}${stockText}${selected ? ', selected' : ''}${disabled ? `, disabled: ${disabledReason || 'unavailable'}` : ''}`;

  const motionProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.12 },
      }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: {
          type: 'spring' as const,
          stiffness: 380,
          damping: 22,
          mass: 0.9,
          delay: index * 0.06,
        },
        whileHover: disabled ? {} : { scale: 1.02, y: -2 },
        whileTap: disabled ? {} : { scale: 0.98, y: 0 },
      };

  return (
    <motion.div
      {...motionProps}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      data-testid={`ingredient-card-${ingredient.id}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`relative flex flex-col justify-between p-3 sm:p-4 rounded-2xl border-2 select-none min-h-[130px] sm:min-h-[148px] ${
        disabled
          ? 'opacity-40 bg-[#F4EFE2] border-[#57514A] cursor-not-allowed'
          : selected
          ? 'bg-[#FFFDF7] border-[#1E1B18] ring-4 ring-[#FFB703] shadow-[0_6px_0_#1E1B18] -translate-y-1 cursor-pointer'
          : 'bg-[#FFFFFF] border-[#1E1B18] shadow-[0_4px_0_#1E1B18] cursor-pointer'
      } ${className}`}
    >
      {/* Top row: Price Badge & Stock Warning */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span
          data-testid={`ingredient-price-${ingredient.id}`}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-extrabold border shadow-[0_1px_0_#1E1B18] ${
            isBasic
              ? 'bg-[#1D7A4C] text-[#FFFDF7] border-[#1E1B18]'
              : 'bg-[#FFB703] text-[#1E1B18] border-[#1E1B18]'
          }`}
        >
          {isBasic ? 'FREE ($0)' : `$${ingredient.basePrice} Base`}
        </span>

        {isScarce && (
          <span
            data-testid={`stock-badge-${ingredient.id}`}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#DC2626] text-[#FFFDF7] border border-[#1E1B18]"
          >
            Only 1!
          </span>
        )}
      </div>

      {/* Middle row: Icon & Name */}
      <div className="flex items-center gap-2.5 my-1">
        <IngredientArt ingredientId={ingredient.id} size={42} />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs sm:text-sm font-extrabold font-display text-[#1E1B18] truncate leading-tight">
            {ingredient.name}
          </h4>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#155E38]">
            <Sparkles className="w-3 h-3 text-[#FFB703]" />
            <span>+{ingredient.tasteScore} Taste</span>
          </span>
        </div>
      </div>

      {/* Bottom row: Flavor Tag Pills or Disabled Reason */}
      <div className="mt-2 pt-2 border-t border-[#F4EFE2] flex flex-wrap gap-1 items-center min-h-[24px]">
        {disabled && disabledReason ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#DC2626]">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{disabledReason}</span>
          </span>
        ) : (
          ingredient.tags.map((tag) => (
            <TagPill key={tag} tag={tag} size="sm" showLabel={false} />
          ))
        )}
      </div>

      {/* Selected Indicator Checkmark */}
      {selected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1D7A4C] border-2 border-[#1E1B18] text-[#FFFFFF] flex items-center justify-center font-extrabold text-xs shadow-[0_2px_0_#1E1B18]">
          ✓
        </div>
      )}
    </motion.div>
  );
};
