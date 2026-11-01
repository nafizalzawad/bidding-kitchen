import React from 'react';
import type { FlavorTag } from '@bidding-kitchen/shared';
import { FLAVOR_TAG_META } from '../../tokens/design-tokens.js';

export interface TagPillProps {
  tag: FlavorTag;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const TagPill: React.FC<TagPillProps> = ({ tag, size = 'md', showLabel = true }) => {
  const meta = FLAVOR_TAG_META[tag];

  const renderIcon = () => {
    const iconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

    switch (meta.iconName) {
      case 'flame-smoke': // SMOKY: Wavy campfire
        return (
          <svg
            className={iconSizeClass}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2C9.5 5 8 7.5 8 10.5c0 2.5 1.8 4.2 3.2 5.5.5.4.8.8.8 1.5 0 .8-.6 1.5-1.5 1.5-.4 0-.8-.1-1.1-.4C8.4 17.8 8 16.5 8 15c-3 1.5-4 4.5-4 7 0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2 0-3.5-2-7-5-9.5 0 2-1 3.5-2.5 3.5-.8 0-1.5-.7-1.5-1.5 0-1.2.8-2.2 1.6-3.2C13.5 9.7 15 7.5 15 5c0-1.2-.5-2.2-1.2-3H12z" />
          </svg>
        );

      case 'chili-pepper': // SPICY: Triangle chili pepper
        return (
          <svg
            className={iconSizeClass}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M14.5 2c-.6 0-1.2.3-1.6.8L11 5.5l-1.9-1.9c-.8-.8-2-.8-2.8 0s-.8 2 0 2.8L8.2 8.3C6.4 10.5 5 13.5 5 17c0 3.9 3.1 5 7 5 5 0 8-3.5 8-8.5 0-3.5-1.8-6.5-4-8.8l1.1-1.1c.8-.8.8-2 0-2.8-.4-.5-1-.8-1.6-.8h-1z" />
          </svg>
        );

      case 'crown-diamond': // RICH: Diamond crown
        return (
          <svg
            className={iconSizeClass}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2L3 8l3 12h12l3-12-9-6zm0 4.2L17.2 9l-1.8 7.2H8.6L6.8 9 12 6.2z" />
          </svg>
        );

      case 'spark-burst': // CRISPY: 6-point star
        return (
          <svg
            className={iconSizeClass}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2l2.5 6.5L21 9l-5 4.5 1.5 7L12 17l-5.5 3.5 1.5-7-5-4.5 6.5-.5L12 2z" />
          </svg>
        );

      case 'leaf-sprout': // FRESH: Leaf sprout
        return (
          <svg
            className={iconSizeClass}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.75a8.2 8.2 0 0 0-4.08 3.55C7.2 9.5 11 8.5 17 8z" />
          </svg>
        );

      default:
        return null;
    }
  };

  const sizeClasses =
    size === 'sm'
      ? showLabel
        ? 'px-2 py-0.5 text-[10px] gap-1'
        : 'p-1 text-[10px]'
      : showLabel
      ? 'px-2.5 py-1 text-xs gap-1.5'
      : 'p-1.5 text-xs';

  return (
    <span
      data-testid={`flavor-pill-${tag.toLowerCase()}`}
      className={`inline-flex items-center rounded-full font-bold select-none border border-[#1E1B18] shadow-[0_1px_0_#1E1B18] ${sizeClasses}`}
      style={{
        backgroundColor: meta.bgHex,
        color: meta.textHex,
        borderColor: meta.borderHex,
      }}
      title={meta.description}
    >
      {renderIcon()}
      {showLabel && <span className="font-display tracking-wide">{meta.label}</span>}
    </span>
  );
};
