import React from 'react';
import type { AwardedIngredient, TierId } from '@bidding-kitchen/shared';
import { useReducedMotion } from '../../hooks/useReducedMotion.js';

export interface DishVisualizerProps {
  dish: AwardedIngredient[];
  tier?: TierId;
  chefName?: string;
  dishName?: string;
  isHero?: boolean;
  elapsedMs?: number;
  dishSlapPhase?: 'waiting' | 'slapping' | 'landed';
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
  tier,
  chefName,
  dishName,
  isHero = false,
  elapsedMs,
  dishSlapPhase,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();

  const isSlapping =
    !prefersReducedMotion &&
    (dishSlapPhase === 'slapping' ||
      (elapsedMs !== undefined && elapsedMs >= 950 && elapsedMs <= 1430));

  const detectedTier: TierId =
    tier ??
    (dish.some((d) => d?.ingredient?.slot === 'DOUGH' || d?.ingredient?.slot === 'PIZZA_SAUCE')
      ? 'BISTRO'
      : dish.some((d) => d?.ingredient?.slot === 'CUT' || d?.ingredient?.slot === 'SIDE')
      ? 'CHEFS_TABLE'
      : 'STREET');

  // Extract ingredients by slot
  const bunAward = dish.find((a) => a?.ingredient?.slot === 'BUN');
  const sauceAward = dish.find((a) => a?.ingredient?.slot === 'SAUCE');
  const pattyAward = dish.find((a) => a?.ingredient?.slot === 'PATTY');
  const cheeseAward = dish.find((a) => a?.ingredient?.slot === 'CHEESE');
  const toppingAward = dish.find((a) => a?.ingredient?.slot === 'TOPPING');

  // Bistro pizza slots
  const doughAward = dish.find((a) => a?.ingredient?.slot === 'DOUGH');
  const pizzaSauceAward = dish.find((a) => a?.ingredient?.slot === 'PIZZA_SAUCE');
  const pizzaCheeseAward = dish.find((a) => a?.ingredient?.slot === 'PIZZA_CHEESE');
  const mainToppingAward = dish.find((a) => a?.ingredient?.slot === 'MAIN_TOPPING');
  const finishAward = dish.find((a) => a?.ingredient?.slot === 'FINISH');

  // Chef's Table steak dinner slots
  const cutAward = dish.find((a) => a?.ingredient?.slot === 'CUT');
  const sideAward = dish.find((a) => a?.ingredient?.slot === 'SIDE');
  const steakSauceAward = dish.find((a) => a?.ingredient?.slot === 'STEAK_SAUCE');
  const garnishAward = dish.find((a) => a?.ingredient?.slot === 'GARNISH');
  const drinkAward = dish.find((a) => a?.ingredient?.slot === 'DRINK');
  const dessertAward = dish.find((a) => a?.ingredient?.slot === 'DESSERT');

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

  return (
    <div
      data-testid="dish-visualizer"
      className={`relative w-full rounded-2xl border-2 border-[#1E1B18] bg-[#F4EFE2] flex flex-col items-center justify-between shadow-[0_4px_0_#1E1B18] overflow-hidden ${
        isHero ? 'min-h-[220px] p-4' : 'min-h-[88px] max-h-[88px] sm:min-h-[140px] sm:max-h-none p-2'
      } ${className}`}
    >
      {/* Visual squash & impact sizzle indicator when slap is active */}
      {isSlapping && (
        <div
          data-testid="dish-slap-active"
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-20"
        >
          <div className="w-20 h-8 rounded-full border-2 border-[#FFB703] animate-ping opacity-60" />
        </div>
      )}

      {/* Optional Top Label */}
      {(chefName || dishName) && (
        <div className="w-full flex items-center justify-between text-xs font-extrabold font-display px-2 text-[#1E1B18] z-10 shrink-0">
          <span className="truncate">
            {chefName
              ? `${chefName}'s ${detectedTier === 'BISTRO' ? 'Pizza' : detectedTier === 'CHEFS_TABLE' ? 'Dinner' : 'Burger'}`
              : detectedTier === 'BISTRO'
              ? 'Artisan Pizza'
              : detectedTier === 'CHEFS_TABLE'
              ? "Chef's Table"
              : 'Burger Plate'}
          </span>
          {dishName && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFB703] border border-[#1E1B18] text-[#1E1B18] truncate ml-2">
              {dishName}
            </span>
          )}
        </div>
      )}

      {/* BISTRO PIZZA PEEL */}
      {detectedTier === 'BISTRO' && (
        <svg
          data-testid="dish-visualizer-pizza"
          viewBox="0 0 200 130"
          className={`w-full h-full max-h-[120px] sm:max-h-[160px] my-auto select-none overflow-visible transition-transform duration-150 ${
            isSlapping ? 'scale-y-[0.88] translate-y-1' : 'scale-y-100 translate-y-0'
          }`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Wooden Pizza Peel */}
          <path d="M15 110L45 85" stroke="#92400E" strokeWidth="8" strokeLinecap="round" />
          <ellipse cx="106" cy="72" rx="78" ry="46" fill="#D97706" stroke="#1E1B18" strokeWidth="3" />
          <ellipse cx="106" cy="70" rx="72" ry="42" fill="#B45309" opacity="0.3" />

          {/* DOUGH CRUST */}
          {doughAward && (
            <g data-testid="pizza-layer-dough">
              <ellipse cx="106" cy="70" rx="66" ry="38" fill="#F59E0B" stroke="#1E1B18" strokeWidth="2.5" />
              <ellipse cx="106" cy="68" rx="60" ry="34" fill="#FDE68A" />
            </g>
          )}

          {/* SAUCE BASE */}
          {pizzaSauceAward && (
            <g data-testid="pizza-layer-sauce">
              <ellipse cx="106" cy="68" rx="54" ry="30" fill="#DC2626" stroke="#1E1B18" strokeWidth="1.5" />
            </g>
          )}

          {/* MELTED CHEESE */}
          {pizzaCheeseAward && (
            <g data-testid="pizza-layer-cheese">
              <ellipse cx="106" cy="68" rx="50" ry="27" fill="#FEF08A" stroke="#1E1B18" strokeWidth="1.5" />
              <circle cx="85" cy="62" r="7" fill="#FFFDF7" opacity="0.9" />
              <circle cx="125" cy="74" r="8" fill="#FFFDF7" opacity="0.9" />
              <circle cx="108" cy="56" r="6" fill="#FFFDF7" opacity="0.9" />
            </g>
          )}

          {/* MAIN TOPPING */}
          {mainToppingAward && (
            <g data-testid="pizza-layer-topping">
              <circle cx="80" cy="64" r="7" fill="#B91C1C" stroke="#1E1B18" strokeWidth="1.5" />
              <circle cx="104" cy="72" r="7.5" fill="#B91C1C" stroke="#1E1B18" strokeWidth="1.5" />
              <circle cx="128" cy="60" r="7" fill="#B91C1C" stroke="#1E1B18" strokeWidth="1.5" />
              <circle cx="95" cy="52" r="6" fill="#B91C1C" stroke="#1E1B18" strokeWidth="1.5" />
              <circle cx="118" cy="80" r="6" fill="#B91C1C" stroke="#1E1B18" strokeWidth="1.5" />
            </g>
          )}

          {/* FINISH */}
          {finishAward && (
            <g data-testid="pizza-layer-finish">
              <path d="M88 56C86 50 94 48 98 52C96 58 90 60 88 56Z" fill="#22C55E" stroke="#1E1B18" strokeWidth="1" />
              <path d="M115 62C113 56 122 54 125 58C123 64 117 66 115 62Z" fill="#16A34A" stroke="#1E1B18" strokeWidth="1" />
              <path d="M102 78C100 72 108 70 112 74C110 80 104 82 102 78Z" fill="#22C55E" stroke="#1E1B18" strokeWidth="1" />
            </g>
          )}

          {dish.length === 0 && (
            <text x="106" y="75" textAnchor="middle" fontSize="12" fill="#1E1B18" fontWeight="bold">
              Empty Peel — Ready to Bake!
            </text>
          )}
        </svg>
      )}

      {/* CHEF'S TABLE SLATE PLATTER */}
      {detectedTier === 'CHEFS_TABLE' && (
        <svg
          data-testid="dish-visualizer-steak"
          viewBox="0 0 200 130"
          className={`w-full h-full max-h-[120px] sm:max-h-[160px] my-auto select-none overflow-visible transition-transform duration-150 ${
            isSlapping ? 'scale-y-[0.88] translate-y-1' : 'scale-y-100 translate-y-0'
          }`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Slate Platter */}
          <rect x="18" y="22" width="164" height="86" rx="10" fill="#1E293B" stroke="#0F172A" strokeWidth="3" />
          <rect x="22" y="26" width="156" height="78" rx="8" fill="#334155" opacity="0.3" stroke="#475569" strokeWidth="1" />

          {/* SAUCE DRIZZLE */}
          {steakSauceAward && (
            <g data-testid="steak-layer-sauce">
              <path d="M50 78C70 65 110 90 140 70" stroke="#3B1208" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
              <path d="M60 82C80 70 120 92 135 75" stroke="#5A2216" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}

          {/* CUT OF STEAK (CENTER) */}
          {cutAward && (
            <g data-testid="steak-layer-cut">
              <rect x="70" y="42" width="60" height="38" rx="8" fill="#78350F" stroke="#1E1B18" strokeWidth="2.5" />
              <line x1="78" y1="46" x2="92" y2="76" stroke="#3B1208" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="94" y1="46" x2="108" y2="76" stroke="#3B1208" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="110" y1="46" x2="124" y2="76" stroke="#3B1208" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}

          {/* SIDE DISH (LEFT) */}
          {sideAward && (
            <g data-testid="steak-layer-side">
              <ellipse cx="46" cy="58" rx="18" ry="12" fill="#FEF08A" stroke="#1E1B18" strokeWidth="2" />
              <ellipse cx="46" cy="56" rx="14" ry="8" fill="#FACC15" />
            </g>
          )}

          {/* GARNISH (TOP) */}
          {garnishAward && (
            <g data-testid="steak-layer-garnish">
              <path d="M96 46L102 34M102 34C98 30 94 36 100 38M102 34C108 28 112 36 106 38" stroke="#15803D" strokeWidth="2" fill="#22C55E" />
            </g>
          )}

          {/* DRINK (UPPER RIGHT) */}
          {drinkAward && (
            <g data-testid="steak-layer-drink">
              <rect x="146" y="32" width="18" height="26" rx="3" fill="#FB923C" stroke="#1E1B18" strokeWidth="2" />
              <line x1="146" y1="42" x2="164" y2="42" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.6" />
            </g>
          )}

          {/* DESSERT (LOWER RIGHT) */}
          {dessertAward && (
            <g data-testid="steak-layer-dessert">
              <ellipse cx="152" cy="80" rx="14" ry="7" fill="#F8FAFC" stroke="#1E1B18" strokeWidth="2" />
              <ellipse cx="152" cy="76" rx="11" ry="5" fill="#B45309" stroke="#1E1B18" strokeWidth="1" />
            </g>
          )}

          {dish.length === 0 && (
            <text x="100" y="70" textAnchor="middle" fontSize="12" fill="#94A3B8" fontWeight="bold">
              Empty Platter — Ready to Plate!
            </text>
          )}
        </svg>
      )}

      {/* STREET BURGER PLATTER */}
      {detectedTier === 'STREET' && (
      <svg
        data-testid="dish-visualizer-burger"
        viewBox="0 0 200 130"
        className={`w-full h-full max-h-[120px] sm:max-h-[160px] my-auto select-none overflow-visible transition-transform duration-150 ${
          isSlapping ? 'scale-y-[0.88] translate-y-1' : 'scale-y-100 translate-y-0'
        }`}
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
      )}
    </div>
  );
};
