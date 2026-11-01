import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { PublicMatchView, PublicPlayerView } from '@bidding-kitchen/shared';
import { TIERS } from '@bidding-kitchen/shared';
import { Download, Check } from 'lucide-react';
import { socketClient } from '../../network/socket-client.js';

export interface ShareCardCanvasProps {
  match: PublicMatchView;
  player: PublicPlayerView;
  onDownloaded?: () => void;
  className?: string;
}

/**
 * ShareCardCanvas generates an exportable high-res 16:9 PNG share card (800x450)
 * summarizing the player's final dish, score, combos, and secret order completion.
 */
export const ShareCardCanvas: React.FC<ShareCardCanvasProps> = ({
  match,
  player,
  onDownloaded,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pngReady, setPngReady] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof ctx.fillRect !== 'function' || typeof ctx.strokeRect !== 'function') {
      setPngReady(true);
      return;
    }

    const width = 800;
    const height = 450;
    canvas.width = width;
    canvas.height = height;

    // 1. Background Gradient
    if (typeof ctx.createLinearGradient === 'function') {
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#1E293B');
      bgGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = bgGrad;
    } else {
      ctx.fillStyle = '#1E293B';
    }
    ctx.fillRect(0, 0, width, height);

    // Decorative subtle kitchen grid / radial glow
    if (typeof ctx.createRadialGradient === 'function') {
      const radial = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 400);
      radial.addColorStop(0, 'rgba(255, 183, 3, 0.12)');
      radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Chunky Outer Border Frame
    ctx.strokeStyle = '#FFB703';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    ctx.strokeStyle = '#1E1B18';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // 3. Top Header: Game & Tier Subtitle
    ctx.fillStyle = '#FFB703';
    ctx.font = '900 22px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BIDDING KITCHEN', 44, 58);

    const tierDef = TIERS[match.tier];
    const tierName = tierDef ? tierDef.name.toUpperCase() : match.tier;
    const roundsCount = tierDef ? tierDef.roundsCount : 5;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '700 13px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${tierName} • ${roundsCount} ROUNDS`, 44, 78);

    // 4. Chef Nickname & Score Callout
    const playerScore = match.result?.scoresByPlayer[player.id];
    const finalScore = playerScore?.finalScore ?? 0;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 20px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(player.nickname, width - 44, 58);

    ctx.fillStyle = '#10B981';
    ctx.font = '900 26px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${finalScore} PTS`, width - 44, 86);

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(44, 102);
    ctx.lineTo(width - 44, 102);
    ctx.stroke();

    // 5. Dish Name Callout
    const dishName = playerScore?.generatedDishName || `${player.nickname}'s Gourmet Creation`;
    ctx.fillStyle = '#FFFDF7';
    ctx.font = '900 32px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(dishName, 44, 146);

    // 6. Plated Ingredients List
    const ingredients = (player?.dish ?? []).map((d) => d?.ingredient).filter(Boolean);
    const startX = 44;
    const startY = 180;
    const colWidth = 340;

    ingredients.forEach((ing, idx) => {
      if (!ing) return;
      const col = idx >= 3 ? 1 : 0;
      const row = idx >= 3 ? idx - 3 : idx;
      const x = startX + col * colWidth;
      const y = startY + row * 44;

      // Tag pill indicator
      ctx.fillStyle = ing.isBasic ? '#334155' : '#D97706';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(x, y - 18, 12, 12, 3);
      } else {
        ctx.rect(x, y - 18, 12, 12);
      }
      ctx.fill();

      // Slot and Name
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '700 15px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${ing.name ?? ing.id}`, x + 20, y - 7);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${ing.slot ?? ''} • ${ing.tasteScore ?? 0} pts`, x + 20, y + 8);
    });

    // 7. Combos & Secret Order Status Badges
    const bottomY = 350;
    const completedCombos = playerScore?.combos ?? [];

    if (completedCombos.length > 0) {
      ctx.fillStyle = '#38BDF8';
      ctx.font = '800 14px system-ui, -apple-system, sans-serif';
      const comboText = completedCombos.map((c: { name: string }) => c.name).join(' • ');
      ctx.fillText(`COMBOS: ${comboText}`, 44, bottomY);
    }

    if (playerScore?.orderCompleted) {
      ctx.fillStyle = '#F59E0B';
      ctx.font = '800 14px system-ui, -apple-system, sans-serif';
      ctx.fillText('★ SECRET CUSTOMER ORDER COMPLETED (+5 PTS)', 44, bottomY + 24);
    }

    // 8. Footer Watermark
    ctx.fillStyle = '#64748B';
    ctx.font = '700 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('biddingkitchen.com', width - 44, height - 32);

    setPngReady(true);
  }, [match, player]);

  useEffect(() => {
    drawCard();
  }, [drawCard]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    const safeNick = player.nickname.toLowerCase().replace(/[^a-z0-9]/g, '-');
    link.download = `bidding-kitchen-${safeNick}-${match.tier.toLowerCase()}.png`;
    link.href = dataUrl;
    link.click();

    setDownloaded(true);
    const scoreVal = match.result?.scoresByPlayer[player.id]?.finalScore ?? 0;
    socketClient.trackTelemetry('SHARE_CLICKED', { tier: match.tier, score: scoreVal });
    onDownloaded?.();
  };

  return (
    <div
      data-testid="share-card-container"
      data-png-ready={pngReady ? 'true' : 'false'}
      className={`flex flex-col items-center gap-3 w-full max-w-lg mx-auto ${className}`}
    >
      <div className="relative w-full overflow-hidden rounded-2xl border-3 border-[#1E1B18] shadow-[0_6px_0_#1E1B18] bg-[#0F172A] aspect-video">
        <canvas
          ref={canvasRef}
          data-testid="share-card-canvas"
          className="w-full h-full object-cover"
        />
      </div>

      <button
        type="button"
        data-testid="download-share-png-btn"
        onClick={handleDownload}
        disabled={!pngReady}
        className="w-full py-3 px-5 rounded-2xl bg-[#FFB703] hover:bg-[#FFAA00] active:translate-y-1 text-[#1E1B18] font-black text-sm uppercase tracking-wide border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] flex items-center justify-center gap-2 transition-transform disabled:opacity-50 cursor-pointer"
      >
        {downloaded ? (
          <>
            <Check className="w-5 h-5 text-[#10B981]" />
            <span>Saved to Downloads!</span>
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            <span>Download Dish Card (PNG)</span>
          </>
        )}
      </button>
    </div>
  );
};
