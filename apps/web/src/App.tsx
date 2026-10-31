import React, { useState, useEffect } from 'react';
import {
  STREET_INGREDIENTS,
  TIERS,
  COMBO_DEFINITIONS,
  type FlavorTag,
  type SlotType,
} from '@bidding-kitchen/shared';
import { TagPill } from './components/ui/TagPill.js';
import { FLAVOR_TAG_META } from './tokens/design-tokens.js';
import { RefreshCw, Coins, Sparkles, Layers, ShieldCheck, Flame } from 'lucide-react';

interface HealthData {
  status: string;
  version: string;
  activeRooms: number;
  sharedContractsLoaded: boolean;
  streetIngredientsCount: number;
}

export const App: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<'online' | 'offline (standalone preview)'>('offline (standalone preview)');
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotType | 'ALL'>('ALL');

  const fetchHealth = async () => {
    setLoading(true);
    const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
    try {
      // First try relative path /health (via Vite proxy) then fallback to serverUrl/health
      let res = await fetch('/health').catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${serverUrl}/health`);
      }
      if (res.ok) {
        const data: HealthData = await res.json();
        setHealthData(data);
        setHealthStatus('online');
      } else {
        setHealthStatus('offline (standalone preview)');
      }
    } catch {
      setHealthStatus('offline (standalone preview)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const flavorTags: FlavorTag[] = ['SMOKY', 'SPICY', 'RICH', 'CRISPY', 'FRESH'];
  const streetSlots: SlotType[] = TIERS.STREET.slots;

  const filteredIngredients =
    selectedSlot === 'ALL'
      ? STREET_INGREDIENTS
      : STREET_INGREDIENTS.filter((i) => i.slot === selectedSlot);

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-[#1E1B18] px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto selection:bg-[#FFB703] selection:text-[#1E1B18]">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b-2 border-[#1E1B18] gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-4xl filter drop-shadow-sm" role="img" aria-label="Burger">🍔</span>
            <div>
              <h1
                data-testid="app-title"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-[#1E1B18] flex items-center gap-2"
              >
                Bidding Kitchen
                <span className="text-xs uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FFB703] text-[#1E1B18] border-2 border-[#1E1B18] font-bold shadow-[2px_2px_0px_#1E1B18]">
                  Phase 1: Contracts & Token Swatch
                </span>
              </h1>
              <p className="text-sm text-[#57514A] font-medium mt-1">
                Bright Bouncy Cartoon Kitchen Design System & Single-Source Domain Contracts
              </p>
            </div>
          </div>
        </div>

        {/* Server Health Badge */}
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <div
            data-testid="server-health-badge"
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 border-[#1E1B18] text-xs font-bold shadow-[0_3px_0_#1E1B18] ${
              healthStatus === 'online'
                ? 'bg-[#1D7A4C] text-[#FFFDF7]'
                : 'bg-[#FFB703] text-[#1E1B18]'
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                healthStatus === 'online' ? 'bg-[#FFFDF7] animate-pulse' : 'bg-[#1E1B18]'
              }`}
            />
            <span>
              {healthStatus === 'online'
                ? `online (Fastify v${healthData?.version ?? '0.1.0'} • ${healthData?.streetIngredientsCount ?? 19} items)`
                : 'offline (standalone preview)'}
            </span>
          </div>

          <button
            onClick={fetchHealth}
            disabled={loading}
            aria-label="Refresh server health status"
            className="min-h-[44px] min-w-[44px] p-2.5 bg-[#FFFFFF] hover:bg-[#F4EFE2] text-[#1E1B18] rounded-xl border-2 border-[#1E1B18] shadow-[0_3px_0_#1E1B18] active:translate-y-0.5 active:shadow-[0_1px_0_#1E1B18] transition flex items-center justify-center cursor-pointer"
            title="Refresh Server Health"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="space-y-8">
        {/* Section 1: Colorblind-Safe FlavorTag Showcase */}
        <section
          aria-labelledby="tag-swatch-heading"
          data-testid="tag-swatch-section"
          className="bg-[#FFFFFF] p-5 sm:p-6 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18]"
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-[#1D7A4C]" />
            <h2 id="tag-swatch-heading" className="text-xl font-bold font-display text-[#1E1B18]">
              Colorblind-Safe Design Tokens (5 FlavorTags)
            </h2>
          </div>
          <p className="text-xs text-[#57514A] mb-4">
            Dual-coded with unique high-contrast colors and distinct geometric SVG silhouettes (campfire, chili, diamond crown, 6-point star, leaf) so all players distinguish synergies instantly without relying on color alone.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {flavorTags.map((tag) => {
              const meta = FLAVOR_TAG_META[tag];
              return (
                <div
                  key={tag}
                  className="p-3.5 rounded-xl bg-[#F4EFE2] border-2 border-[#1E1B18] shadow-[0_2px_0_#1E1B18] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <TagPill tag={tag} size="md" />
                    <span className="text-[10px] font-mono font-bold text-[#57514A]">
                      SVG {meta.iconName}
                    </span>
                  </div>
                  <p className="text-xs text-[#1E1B18] mt-1 font-medium leading-relaxed">
                    {meta.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 2: Tier Summary Cards */}
        <section
          aria-labelledby="tier-list-heading"
          data-testid="tier-list-section"
          className="bg-[#FFFFFF] p-5 sm:p-6 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-6 h-6 text-[#2563EB]" />
            <h2 id="tier-list-heading" className="text-xl font-bold font-display text-[#1E1B18]">
              Match Tiers & Starting Budgets
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.values(TIERS).map((tier) => (
              <div
                key={tier.id}
                className={`p-4 rounded-xl border-2 border-[#1E1B18] shadow-[0_3px_0_#1E1B18] ${
                  tier.mvpEnabled ? 'bg-[#FFFDF7]' : 'bg-[#F4EFE2] opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#1E1B18] text-[#FFFDF7]">
                    {tier.name}
                  </span>
                  {tier.mvpEnabled ? (
                    <span className="text-xs font-bold text-[#1D7A4C] bg-[#1D7A4C]/10 border border-[#1D7A4C]/30 px-2 py-0.5 rounded-full">
                      MVP Active
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#57514A]">v1.5 Roadmap</span>
                  )}
                </div>
                <h3 className="text-lg font-bold font-display text-[#1E1B18]">
                  ${tier.startingBudget} {tier.dishName}
                </h3>
                <p className="text-xs text-[#57514A] mt-1">
                  {tier.roundsCount} Auction Rounds: {tier.slots.join(' → ')}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Street Tier (19 Ingredients) */}
        <section
          aria-labelledby="street-ingredients-heading"
          data-testid="street-ingredients-section"
          className="bg-[#FFFFFF] p-5 sm:p-6 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-[#E63946]" />
                <h2 id="street-ingredients-heading" className="text-xl font-bold font-display text-[#1E1B18]">
                  Canonical Street Tier ($20 Burger) Dataset
                </h2>
              </div>
              <p className="text-xs text-[#57514A] mt-0.5">
                5 Slots • 19 Canonical Variants • Sum of Max Base Prices = $21 (Strict Scarcity &gt; $20 Budget)
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setSelectedSlot('ALL')}
                className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-[#1E1B18] transition cursor-pointer ${
                  selectedSlot === 'ALL'
                    ? 'bg-[#1E1B18] text-[#FFFDF7]'
                    : 'bg-[#F4EFE2] text-[#1E1B18] hover:bg-[#FFFDF7]'
                }`}
              >
                All (19)
              </button>
              {streetSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg text-xs font-bold border-2 border-[#1E1B18] transition cursor-pointer ${
                    selectedSlot === slot
                      ? 'bg-[#1E1B18] text-[#FFFDF7]'
                      : 'bg-[#F4EFE2] text-[#1E1B18] hover:bg-[#FFFDF7]'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of 19 Ingredients */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredIngredients.map((ing) => (
              <article
                key={ing.id}
                data-testid={`ingredient-card-${ing.id}`}
                className="bg-[#FFFDF7] p-4 rounded-xl border-2 border-[#1E1B18] shadow-[0_3px_0_#1E1B18] flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-[0_5px_0_#1E1B18] transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded bg-[#1E1B18] text-[#FFFDF7]">
                      {ing.slot}
                    </span>
                    {ing.isBasic ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1D7A4C]/15 text-[#1D7A4C] border border-[#1D7A4C]/40">
                        Free Basic ($0)
                      </span>
                    ) : ing.stock === 1 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E63946]/15 text-[#E63946] border border-[#E63946]/40">
                        Stock: 1 (Limited)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F4EFE2] text-[#57514A] border border-[#1E1B18]/20">
                        Stock: {ing.stock}
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-lg text-[#1E1B18] font-display">
                    {ing.name}
                  </h3>

                  <div className="flex items-center gap-4 mt-2 tabular-nums">
                    <div className="flex items-center gap-1 font-bold text-sm text-[#1E1B18]">
                      <Coins className="w-4 h-4 text-[#FFB703]" />
                      <span>${ing.basePrice}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-sm text-[#1D7A4C]">
                      <Sparkles className="w-4 h-4 text-[#1D7A4C]" />
                      <span>Taste: {ing.tasteScore}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#1E1B18]/15 flex flex-wrap gap-1.5 min-h-[28px] items-center">
                  {ing.tags.length > 0 ? (
                    ing.tags.map((tag) => <TagPill key={tag} tag={tag} size="sm" />)
                  ) : (
                    <span className="text-[11px] text-[#57514A] italic">No tags</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Combos Reference Card */}
        <section className="bg-[#FFFFFF] p-5 sm:p-6 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18]">
          <h2 className="text-xl font-bold font-display text-[#1E1B18] mb-3">
            Synergy Combos (4 Synergies)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {COMBO_DEFINITIONS.map((combo) => (
              <div
                key={combo.id}
                className="p-3.5 rounded-xl bg-[#F4EFE2] border-2 border-[#1E1B18] shadow-[0_2px_0_#1E1B18] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-sm font-display text-[#1E1B18]">{combo.name}</h3>
                    <span className="text-xs font-black text-[#1D7A4C]">+{combo.points} pts</span>
                  </div>
                  <p className="text-xs text-[#57514A]">{combo.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-12 pt-6 border-t-2 border-[#1E1B18] text-xs font-medium text-[#57514A] flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Bidding Kitchen © 2026 • Phase 1 Contract Diagnostic &amp; Design Token Swatch</span>
        <span className="font-mono text-[11px]">Strict TypeScript • Zero Dependencies • Fastify 5</span>
      </footer>
    </div>
  );
};

export default App;
