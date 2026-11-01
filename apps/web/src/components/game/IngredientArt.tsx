import React from 'react';

export interface IngredientArtProps {
  ingredientId: string;
  className?: string;
  size?: number | string;
}

/**
 * Custom chunky cartoon inline SVGs for all 19 Street Burger ingredients.
 * Features 2px ink borders (#1E1B18), vibrant flat palettes, and distinct silhouettes.
 */
export const IngredientArt: React.FC<IngredientArtProps> = ({
  ingredientId,
  className = '',
  size = 48,
}) => {
  const commonProps = {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className: `shrink-0 ${className}`,
    'data-testid': `ingredient-art-${ingredientId}`,
  };

  switch (ingredientId) {
    // ---------------- BUNS ----------------
    case 'street_bun_basic':
      return (
        <svg {...commonProps}>
          {/* Plain white/cream squishy bun */}
          <path
            d="M8 38C8 22 20 12 32 12C44 12 56 22 56 38C56 42 52 44 46 44H18C12 44 8 42 8 38Z"
            fill="#FBE8D3"
            stroke="#1E1B18"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Soft bun crease */}
          <path d="M16 36C22 34 42 34 48 36" stroke="#E2C7A8" strokeWidth="2.5" strokeLinecap="round" />
          {/* Bottom crust */}
          <rect x="10" y="46" width="44" height="8" rx="4" fill="#F4D2B2" stroke="#1E1B18" strokeWidth="3" />
        </svg>
      );

    case 'street_bun_sesame':
      return (
        <svg {...commonProps}>
          {/* Golden sesame bun */}
          <path
            d="M8 38C8 20 20 10 32 10C44 10 56 20 56 38C56 42 52 44 46 44H18C12 44 8 42 8 38Z"
            fill="#E5A65E"
            stroke="#1E1B18"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Sesame seeds */}
          <ellipse cx="24" cy="22" rx="2" ry="1" fill="#FFFDF7" stroke="#1E1B18" strokeWidth="1" transform="rotate(-15 24 22)" />
          <ellipse cx="34" cy="18" rx="2" ry="1" fill="#FFFDF7" stroke="#1E1B18" strokeWidth="1" transform="rotate(10 34 18)" />
          <ellipse cx="42" cy="26" rx="2" ry="1" fill="#FFFDF7" stroke="#1E1B18" strokeWidth="1" transform="rotate(-25 42 26)" />
          <ellipse cx="20" cy="30" rx="2" ry="1" fill="#FFFDF7" stroke="#1E1B18" strokeWidth="1" transform="rotate(30 20 30)" />
          <ellipse cx="32" cy="28" rx="2" ry="1" fill="#FFFDF7" stroke="#1E1B18" strokeWidth="1" transform="rotate(5 32 28)" />
          {/* Bottom crust */}
          <rect x="10" y="46" width="44" height="8" rx="4" fill="#C6863E" stroke="#1E1B18" strokeWidth="3" />
        </svg>
      );

    case 'street_bun_potato':
      return (
        <svg {...commonProps}>
          {/* Ultra-fluffy warm yellow-gold potato roll */}
          <path
            d="M6 38C6 18 18 8 32 8C46 8 58 18 58 38C58 42 54 44 48 44H16C10 44 6 42 6 38Z"
            fill="#FFCA3A"
            stroke="#1E1B18"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Butter glaze sheen */}
          <path d="M18 18C24 14 38 14 46 20" stroke="#FFFDF7" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          {/* Fluffy dimples */}
          <circle cx="26" cy="28" r="1.5" fill="#E09F1F" />
          <circle cx="38" cy="26" r="1.5" fill="#E09F1F" />
          {/* Bottom crust */}
          <rect x="8" y="46" width="48" height="9" rx="4.5" fill="#E09F1F" stroke="#1E1B18" strokeWidth="3" />
        </svg>
      );

    case 'street_bun_brioche':
      return (
        <svg {...commonProps}>
          {/* Glossy mahogany brioche bun */}
          <path
            d="M6 38C6 18 18 8 32 8C46 8 58 18 58 38C58 43 54 45 48 45H16C10 45 6 43 6 38Z"
            fill="#8B4513"
            stroke="#1E1B18"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Egg wash shine highlight */}
          <path d="M16 18C22 13 40 13 48 18" stroke="#F4A261" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M22 24C28 20 38 20 42 24" stroke="#FFFDF7" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          {/* Bottom brioche heel */}
          <rect x="8" y="47" width="48" height="9" rx="4.5" fill="#6B3410" stroke="#1E1B18" strokeWidth="3" />
        </svg>
      );

    // ---------------- PATTIES ----------------
    case 'street_patty_basic':
      return (
        <svg {...commonProps}>
          {/* Thin grilled beef patty */}
          <rect x="6" y="24" width="52" height="16" rx="8" fill="#78350F" stroke="#1E1B18" strokeWidth="3" />
          {/* Grill lines */}
          <line x1="16" y1="26" x2="24" y2="38" stroke="#1E1B18" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="28" y1="26" x2="36" y2="38" stroke="#1E1B18" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="40" y1="26" x2="48" y2="38" stroke="#1E1B18" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'street_patty_chicken':
      return (
        <svg {...commonProps}>
          {/* Craggy golden crispy fried chicken cutlet */}
          <path
            d="M6 32C8 24 16 20 28 20C38 18 54 22 58 30C60 38 52 44 42 44C26 46 10 44 6 32Z"
            fill="#D97706"
            stroke="#1E1B18"
            strokeWidth="3"
          />
          {/* Crispy panko flakes & jagged bits */}
          <circle cx="16" cy="28" r="2" fill="#FBBF24" stroke="#1E1B18" strokeWidth="1" />
          <circle cx="28" cy="26" r="2.5" fill="#FBBF24" stroke="#1E1B18" strokeWidth="1" />
          <circle cx="44" cy="30" r="2" fill="#FBBF24" stroke="#1E1B18" strokeWidth="1" />
          <circle cx="36" cy="36" r="2" fill="#FBBF24" stroke="#1E1B18" strokeWidth="1" />
          <circle cx="22" cy="38" r="1.5" fill="#FBBF24" />
        </svg>
      );

    case 'street_patty_smash':
      return (
        <svg {...commonProps}>
          {/* Lacy-edged smashed double beef */}
          <path
            d="M4 28C6 24 14 24 20 22C28 20 40 22 48 22C56 24 60 26 60 30C58 36 50 38 42 38C34 40 18 40 8 38C4 36 2 32 4 28Z"
            fill="#451A03"
            stroke="#1E1B18"
            strokeWidth="3"
          />
          {/* Crispy burnt lace edges */}
          <path d="M8 24L12 28M52 24L48 28M24 38L28 42M38 38L42 42" stroke="#1E1B18" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 30C20 28 44 28 52 30" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'street_patty_wagyu':
      return (
        <svg {...commonProps}>
          {/* Thick juicy premium marbled steak patty */}
          <rect x="6" y="20" width="52" height="24" rx="10" fill="#3B1208" stroke="#1E1B18" strokeWidth="3" />
          {/* Melting wagyu fat streaks */}
          <path d="M14 26C18 24 22 28 26 26C30 24 34 28 38 26C42 24 46 28 50 26" stroke="#FDE68A" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M16 34C22 32 28 36 34 32C40 34 46 32 50 34" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" />
          {/* Glistening juice drop */}
          <ellipse cx="48" cy="40" rx="3" ry="2" fill="#FFB703" stroke="#1E1B18" strokeWidth="1" />
        </svg>
      );

    // ---------------- SAUCES ----------------
    case 'street_sauce_basic':
      return (
        <svg {...commonProps}>
          {/* Red ketchup and yellow mustard splats */}
          <path
            d="M8 32C12 24 24 26 30 28C36 30 44 24 54 28C58 34 50 42 42 42C30 42 24 44 14 42C8 40 6 36 8 32Z"
            fill="#E63946"
            stroke="#1E1B18"
            strokeWidth="3"
          />
          {/* Mustard wavy dollop */}
          <path d="M14 34C20 30 30 36 40 32C46 30 50 34 52 36" stroke="#FFB703" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'street_sauce_bbq':
      return (
        <svg {...commonProps}>
          {/* Deep hickory brown BBQ glaze with smoke swirl */}
          <path
            d="M8 30C12 22 26 24 34 26C42 28 50 22 56 28C60 36 50 44 38 42C24 44 14 44 8 38C6 34 6 32 8 30Z"
            fill="#3D1D16"
            stroke="#1E1B18"
            strokeWidth="3"
          />
          {/* BBQ sheen */}
          <path d="M16 32C24 28 38 28 48 32" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          {/* Smoke tendril */}
          <path d="M28 20C26 14 34 12 32 6" stroke="#A8A29E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'street_sauce_chipotle':
      return (
        <svg {...commonProps}>
          {/* Fiery spicy red-orange chipotle mayo */}
          <path
            d="M8 30C14 24 24 24 32 26C40 28 50 24 56 30C60 36 52 42 42 42C30 44 18 44 10 40C6 36 6 32 8 30Z"
            fill="#EA580C"
            stroke="#1E1B18"
            strokeWidth="3"
          />
          {/* Chili pepper flakes */}
          <circle cx="20" cy="32" r="1.5" fill="#991B1B" />
          <circle cx="34" cy="34" r="1.5" fill="#991B1B" />
          <circle cx="46" cy="32" r="1.5" fill="#991B1B" />
          <circle cx="28" cy="38" r="1" fill="#991B1B" />
        </svg>
      );

    case 'street_sauce_truffle':
      return (
        <svg {...commonProps}>
          {/* Rich black truffle aioli with gold sparkle */}
          <path
            d="M8 30C14 24 24 26 32 26C40 26 48 22 56 28C60 36 52 42 42 42C30 44 18 44 10 40C6 36 6 32 8 30Z"
            fill="#27272A"
            stroke="#1E1B18"
            strokeWidth="3"
          />
          {/* Cream swirl */}
          <path d="M16 32C24 30 38 30 48 34" stroke="#F4EFE2" strokeWidth="3" strokeLinecap="round" />
          {/* Gold luxury sparkle */}
          <polygon points="46,16 48,22 54,24 48,26 46,32 44,26 38,24 44,22" fill="#FFB703" stroke="#1E1B18" strokeWidth="1" />
        </svg>
      );

    // ---------------- CHEESES ----------------
    case 'street_cheese_basic':
      return (
        <svg {...commonProps}>
          {/* Square yellow processed slice */}
          <polygon
            points="12,24 52,20 48,44 8,40"
            fill="#FACC15"
            stroke="#1E1B18"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <line x1="20" y1="32" x2="40" y2="30" stroke="#EAB308" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'street_cheese_american':
      return (
        <svg {...commonProps}>
          {/* Oozing melted bright orange American cheese */}
          <path
            d="M8 26C16 22 48 22 56 26C56 30 52 38 48 38C44 38 42 48 38 48C34 48 32 38 26 38C20 38 18 46 14 46C10 46 8 36 8 26Z"
            fill="#FB923C"
            stroke="#1E1B18"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Melt shine */}
          <path d="M16 28C24 26 40 26 48 28" stroke="#FED7AA" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'street_cheese_aged_cheddar':
      return (
        <svg {...commonProps}>
          {/* Sharp crumbly aged cheddar wedge with crystalline holes */}
          <polygon
            points="10,22 54,18 48,44 14,46"
            fill="#D97706"
            stroke="#1E1B18"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Cheddar eyes/holes */}
          <circle cx="22" cy="30" r="3" fill="#B45309" stroke="#1E1B18" strokeWidth="1" />
          <circle cx="38" cy="28" r="2.5" fill="#B45309" stroke="#1E1B18" strokeWidth="1" />
          <circle cx="32" cy="38" r="2" fill="#B45309" stroke="#1E1B18" strokeWidth="1" />
        </svg>
      );

    // ---------------- TOPPINGS ----------------
    case 'street_topping_basic':
      return (
        <svg {...commonProps}>
          {/* Crisp ruffled green iceberg lettuce leaf */}
          <path
            d="M6 32C6 24 14 20 20 22C26 24 32 18 40 20C48 22 56 24 58 30C60 38 52 42 46 40C40 38 32 44 24 42C16 40 6 40 6 32Z"
            fill="#22C55E"
            stroke="#1E1B18"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Leaf vein */}
          <path d="M12 32C22 30 34 32 48 30" stroke="#15803D" strokeWidth="2" strokeLinecap="round" />
          <path d="M24 31L28 26M36 31L40 26" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case 'street_topping_pickles':
      return (
        <svg {...commonProps}>
          {/* Two crinkle-cut tart dill pickle rounds */}
          <circle cx="24" cy="32" r="14" fill="#15803D" stroke="#1E1B18" strokeWidth="3" />
          <circle cx="24" cy="32" r="9" fill="#16A34A" stroke="#1E1B18" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx="42" cy="30" r="13" fill="#15803D" stroke="#1E1B18" strokeWidth="3" />
          <circle cx="42" cy="30" r="8" fill="#16A34A" stroke="#1E1B18" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      );

    case 'street_topping_bacon':
      return (
        <svg {...commonProps}>
          {/* Two wavy, crispy deep-brown bacon strips */}
          <path
            d="M6 24C12 18 18 28 26 22C34 16 42 26 50 20C54 18 58 20 58 24C58 28 52 26 46 30C38 36 30 26 22 32C14 38 8 28 6 24Z"
            fill="#7F1D1D"
            stroke="#1E1B18"
            strokeWidth="2.5"
          />
          <path d="M10 24C16 20 22 28 30 22C38 18 46 26 52 22" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M6 34C12 28 18 38 26 32C34 26 42 36 50 30C54 28 58 30 58 34C58 38 52 36 46 40C38 46 30 36 22 42C14 48 8 38 6 34Z"
            fill="#7F1D1D"
            stroke="#1E1B18"
            strokeWidth="2.5"
          />
          <path d="M10 34C16 30 22 38 30 32C38 28 46 36 52 32" stroke="#F87171" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'street_topping_caramelized_onions':
      return (
        <svg {...commonProps}>
          {/* Sweet glazed golden-brown onion rings */}
          <path
            d="M12 26C16 18 32 18 36 24C40 30 28 38 18 36C12 34 8 30 12 26Z"
            fill="#B45309"
            stroke="#1E1B18"
            strokeWidth="2.5"
          />
          <path
            d="M26 32C30 24 46 24 50 30C54 36 42 44 32 42C26 40 22 36 26 32Z"
            fill="#92400E"
            stroke="#1E1B18"
            strokeWidth="2.5"
          />
          <ellipse cx="24" cy="27" rx="6" ry="3" fill="#D97706" />
          <ellipse cx="38" cy="33" rx="6" ry="3" fill="#D97706" />
        </svg>
      );

    default:
      return (
        <svg {...commonProps}>
          <circle cx="32" cy="32" r="24" fill="#F4EFE2" stroke="#1E1B18" strokeWidth="3" />
          <text x="32" y="38" textAnchor="middle" fontSize="20" fill="#1E1B18" fontWeight="bold">
            🍔
          </text>
        </svg>
      );
  }
};
