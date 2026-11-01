import React from 'react';
import type { AwardedIngredient } from '@bidding-kitchen/shared';

export interface DishVisualizerProps {
  dish: AwardedIngredient[];
  chefName?: string;
  dishName?: string;
  isHero?: boolean;
  className?: string;
}

/**
 * DishVisualizer renders the assembled burger stack on a stylized ceramic plate.
 * Culinary stacking order: Bottom Bun Heel -> Sauce -> Patty -> Cheese -> Toppings -> Top Crown Bun.
 *
 * Invariant: Fixed container heights (min-h-[88px] on mobile, min-h-[220px] on desktop)
 * ensure zero Cumulative Layout Shift (CLS = 0) as rounds progress.
 */
export const DishVisualizer: React.FC<DishVisualizerProps> = ({
  dish,
  chefName,
  dishName,
  isHero = false,
  className = '',
}) => {
  // Extract ingredients by slot
  const bunAward = dish.find((a) => a?.ingredient?.slot === 'BUN');
  const sauceAward = dish.find((a) => a?.ingredient?.slot === 'SAUCE');
  const pattyAward = dish.find((a) => a?.ingredient?.slot === 'PATTY');
  const cheeseAward = dish.find((a) => a?.ingredient?.slot === 'CHEESE');
  const toppingAward = dish.find((a) => a?.ingredient?.slot === 'TOPPING');

  // Stacking visual colors based on won ingredients
  const getBunColors = (id?: string) => {
    switch (id) {
      case 'street_bun_brioche':
        return { fill: '#8B4513', heel: '#6B3410', shine: '#F4A261' };
      case 'street_bun_potato':
        return { fill: '#FFCA3A', heel: '#E09F1F', shine: '#FFFDF7' };
      case 'street_bun_sesame':
        return { fill: '#E5A65E', heel: '#C6863E', shine: '#FFFDF7' };
      case 'street_bun_basic':
      default:
        return { fill: '#FBE8D3', heel: '#F4D2B2', shine: '#FFFDF7' };
    }
  };

  const getPattyColor = (id?: string) => {
    switch (id) {
      case 'street_patty_chicken':
        return '#D97706';
      case 'street_patty_smash':
        return '#451A03';
      case 'street_patty_wagyu':
        return '#3B1208';
      case 'street_patty_basic':
      default:
        return '#78350F';
    }
  };

  const getSauceColor = (id?: string) => {
    switch (id) {
      case 'street_sauce_bbq':
        return '#3D1D16';
      case 'street_sauce_chipotle':
        return '#EA580C';
      case 'street_sauce_truffle':
        return '#27272A';
      case 'street_sauce_basic':
      default:
        return '#E63946';
    }
  };

  const getCheeseColor = (id?: string) => {
    switch (id) {
      case 'street_cheese_american':
        return '#FB923C';
      case 'street_cheese_aged_cheddar':
        return '#D97706';
      case 'street_cheese_basic':
      default:
        return '#FACC15';
    }
  };

  const getToppingColor = (id?: string) => {
    switch (id) {
      case 'street_topping_pickles':
        return '#15803D';
      case 'street_topping_bacon':
        return '#7F1D1D';
      case 'street_topping_caramelized_onions':
        return '#B45309';
      case 'street_topping_basic':
      default:
        return '#22C55E';
    }
  };

  const bunColors = getBunColors(bunAward?.ingredient.id);
  const pattyColor = getPattyColor(pattyAward?.ingredient.id);
  const sauceColor = getSauceColor(sauceAward?.ingredient.id);
  const cheeseColor = getCheeseColor(cheeseAward?.ingredient.id);
  const toppingColor = getToppingColor(toppingAward?.ingredient.id);

  // Stacking heights inside 200x140 SVG viewBox
  // Plate base is at y = 115
  return (
    <div
      data-testid="dish-visualizer"
      className={`relative w-full rounded-2xl border-2 border-[#1E1B18] bg-[#F4EFE2] flex flex-col items-center justify-between shadow-[0_4px_0_#1E1B18] overflow-hidden ${
        isHero ? 'min-h-[220px] p-4' : 'min-h-[88px] max-h-[88px] sm:min-h-[140px] sm:max-h-none p-2'
      } ${className}`}
    >
      {/* Optional Top Label */}
      {(chefName || dishName) && (
        <div className="w-full flex items-center justify-between text-xs font-extrabold font-display px-2 text-[#1E1B18] z-10 shrink-0">
          <span className="truncate">{chefName ? `${chefName}'s Burger` : 'Burger Plate'}</span>
          {dishName && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFB703] border border-[#1E1B18] text-[#1E1B18] truncate ml-2">
              {dishName}
            </span>
          )}
        </div>
      )}

      {/* SVG Culinary Stacking Canvas */}
      <svg
        viewBox="0 0 200 130"
        className="w-full h-full max-h-[120px] sm:max-h-[160px] my-auto select-none overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Ceramic Plate Rim & Base */}
        <ellipse cx="100" cy="115" rx="88" ry="14" fill="#FFFFFF" stroke="#1E1B18" strokeWidth="3" />
        <ellipse cx="100" cy="113" rx="72" ry="10" fill="#FFFDF7" stroke="#E5DECE" strokeWidth="1.5" />

        {/* 1. BOTTOM BUN HEEL */}
        {bunAward && (
          <g data-testid="burger-layer-heel">
            <rect
              x="52"
              y="96"
              width="96"
              height="16"
              rx="7"
              fill={bunColors.heel}
              stroke="#1E1B18"
              strokeWidth="2.5"
            />
            <rect x="56" y="94" width="88" height="6" rx="3" fill={bunColors.fill} opacity="0.6" />
          </g>
        )}

        {/* 2. SAUCE LAYER */}
        {sauceAward && (
          <g data-testid="burger-layer-sauce">
            <path
              d="M50 94C62 88 78 96 90 92C102 88 120 96 136 90C144 94 148 97 150 97C138 101 64 101 50 94Z"
              fill={sauceColor}
              stroke="#1E1B18"
              strokeWidth="2"
            />
          </g>
        )}

        {/* 3. PATTY LAYER */}
        {pattyAward && (
          <g data-testid="burger-layer-patty">
            <rect
              x="44"
              y="76"
              width="112"
              height="20"
              rx="9"
              fill={pattyColor}
              stroke="#1E1B18"
              strokeWidth="2.5"
            />
            {/* Grill marks or sear highlights */}
            <line x1="68" y1="78" x2="80" y2="94" stroke="#1E1B18" strokeWidth="2" strokeLinecap="round" />
            <line x1="94" y1="78" x2="106" y2="94" stroke="#1E1B18" strokeWidth="2" strokeLinecap="round" />
            <line x1="120" y1="78" x2="132" y2="94" stroke="#1E1B18" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* 4. CHEESE MELT LAYER */}
        {cheeseAward && (
          <g data-testid="burger-layer-cheese">
            <polygon
              points="40,78 160,76 148,88 132,84 120,96 100,82 82,94 68,82 48,88"
              fill={cheeseColor}
              stroke="#1E1B18"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* 5. TOPPING LAYER */}
        {toppingAward && (
          <g data-testid="burger-layer-topping">
            <path
              d="M42 66C54 60 70 66 84 62C98 58 114 66 128 60C142 66 156 62 160 68C154 74 138 72 124 74C108 76 92 72 76 74C60 76 44 72 42 66Z"
              fill={toppingColor}
              stroke="#1E1B18"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* 6. TOP BUN CROWN */}
        {bunAward && (
          <g data-testid="burger-layer-crown">
            <path
              d="M48 64C48 36 68 22 100 22C132 22 152 36 152 64C152 68 144 70 134 70H66C56 70 48 68 48 64Z"
              fill={bunColors.fill}
              stroke="#1E1B18"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Top Shine / Glaze */}
            <path d="M68 34C80 28 120 28 132 34" stroke={bunColors.shine} strokeWidth="3" strokeLinecap="round" opacity="0.7" />

            {/* Sesame Seeds if sesame bun */}
            {bunAward.ingredient.id === 'street_bun_sesame' && (
              <g fill="#FFFDF7" stroke="#1E1B18" strokeWidth="0.8">
                <ellipse cx="80" cy="40" rx="2.5" ry="1.2" transform="rotate(-15 80 40)" />
                <ellipse cx="102" cy="34" rx="2.5" ry="1.2" transform="rotate(10 102 34)" />
                <ellipse cx="120" cy="44" rx="2.5" ry="1.2" transform="rotate(-25 120 44)" />
                <ellipse cx="94" cy="48" rx="2.5" ry="1.2" transform="rotate(20 94 48)" />
              </g>
            )}
          </g>
        )}

        {/* Empty Plate placeholder */}
        {dish.length === 0 && (
          <text
            x="100"
            y="75"
            textAnchor="middle"
            fontSize="12"
            fill="#57514A"
            fontWeight="bold"
            className="font-display"
          >
            Empty Plate — Ready to Cook!
          </text>
        )}
      </svg>
    </div>
  );
};
