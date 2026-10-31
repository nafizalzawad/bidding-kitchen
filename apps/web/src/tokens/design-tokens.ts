import type { FlavorTag } from '@bidding-kitchen/shared';

export interface FlavorTagMeta {
  tag: FlavorTag;
  label: string;
  bgHex: string;
  textHex: string;
  borderHex: string;
  iconName: 'flame-smoke' | 'chili-pepper' | 'crown-diamond' | 'spark-burst' | 'leaf-sprout';
  description: string;
}

export const FLAVOR_TAG_META: Record<FlavorTag, FlavorTagMeta> = {
  SMOKY: {
    tag: 'SMOKY',
    label: 'SMOKY',
    bgHex: '#3D2C2E',
    textHex: '#FFFDF7',
    borderHex: '#1E1B18',
    iconName: 'flame-smoke',
    description: 'Wavy campfire • Woodsmoke char & savory depth',
  },
  SPICY: {
    tag: 'SPICY',
    label: 'SPICY',
    bgHex: '#991B1B',
    textHex: '#FFFDF7',
    borderHex: '#1E1B18',
    iconName: 'chili-pepper',
    description: 'Triangle chili • Chili heat & tingling zest',
  },
  RICH: {
    tag: 'RICH',
    label: 'RICH',
    bgHex: '#6B21A8',
    textHex: '#FFFDF7',
    borderHex: '#1E1B18',
    iconName: 'crown-diamond',
    description: 'Diamond crown • Decadent umami, dairy & fat',
  },
  CRISPY: {
    tag: 'CRISPY',
    label: 'CRISPY',
    bgHex: '#B45309',
    textHex: '#FFFDF7',
    borderHex: '#1E1B18',
    iconName: 'spark-burst',
    description: '6-point star • Golden crunch & textured snap',
  },
  FRESH: {
    tag: 'FRESH',
    label: 'FRESH',
    bgHex: '#065F46',
    textHex: '#FFFDF7',
    borderHex: '#1E1B18',
    iconName: 'leaf-sprout',
    description: 'Leaf sprout • Crisp herbs, produce & acidity',
  },
};

export const FLAVOR_TAG_TOKENS = FLAVOR_TAG_META;

export const DESIGN_TOKENS = {
  palette: {
    bgCream: '#FFFDF7',
    bgTile: '#F4EFE2',
    surfaceCard: '#FFFFFF',
    brandTomato: '#E63946',
    brandMustard: '#FFB703',
    brandLettuce: '#1D7A4C',
    brandBlueberry: '#2563EB',
    inkCharcoal: '#1E1B18',
    inkMuted: '#57514A',
  },
  borders: {
    cartoonInk: '2px solid #1E1B18',
    radiusCard: '1rem',
    radiusPill: '9999px',
  },
  shadows: {
    hardOffset: '0 4px 0 #1E1B18',
    hardOffsetSm: '0 2px 0 #1E1B18',
    hardOffsetLg: '0 6px 0 #1E1B18',
  },
  typography: {
    fontDisplay: "'Fredoka', 'Plus Jakarta Sans', system-ui, sans-serif",
    fontBody: "'Plus Jakarta Sans', system-ui, sans-serif",
  },
  touchTarget: {
    minSize: '44px',
  },
} as const;
