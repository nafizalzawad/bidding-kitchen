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
import { RefreshCw, Coins, Sparkles, Layers, ShieldCheck, Flame, Cpu, FileCheck, Zap, Layout } from 'lucide-react';
import { EngineSandboxPanel } from './components/game/EngineSandboxPanel.js';
import { DualClientInspector } from './components/game/DualClientInspector.js';
import { StorybookHarnessScreen } from './screens/StorybookHarnessScreen.js';

interface HealthData {
  status: string;
  version: string;
  activeRooms: number;
  sharedContractsLoaded: boolean;
  streetIngredientsCount: number;
  engineVerified?: boolean;
}

export interface AppProps {
  defaultTab?: 'HARNESS' | 'INSPECTOR' | 'SANDBOX' | 'CONTRACTS';
}

export const App: React.FC<AppProps> = ({ defaultTab = 'INSPECTOR' }) => {
  // Check URL parameters for harness or hideBar
  const isDirectHarnessMode = (): boolean => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('harness') === 'true' || params.has('state');
  };

  const isHideBar = (): boolean => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('hideBar') === 'true';
  };

  // If URL explicitly requests a pure screen capture without outer tabs
  if (isDirectHarnessMode() && isHideBar()) {
    return <StorybookHarnessScreen hideBarDefault={true} />;
  }

  const initialTab = isDirectHarnessMode() ? 'HARNESS' : defaultTab;
  const [activeTab, setActiveTab] = useState<'HARNESS' | 'INSPECTOR' | 'SANDBOX' | 'CONTRACTS'>(initialTab);
  const [healthStatus, setHealthStatus] = useState<'online' | 'offline (standalone preview)'>('offline (standalone preview)');
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotType | 'ALL'>('ALL');

  const fetchHealth = async () => {
    setLoading(true);
    const serverUrl = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';
    try {
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

  // If in full harness view, show the harness screen directly with full controls
  if (activeTab === 'HARNESS') {
    return <StorybookHarnessScreen />;
  }

  return (
    <div className="min-h-screen bg-[#FFFDF7] text-[#1E1B18] px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto selection:bg-[#FFB703] selection:text-[#1E1B18]">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b-2 border-[#1E1B18] gap-4">
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
                  {activeTab === 'INSPECTOR'
                    ? 'Phase 3: Live Dual-Client Inspector'
                    : activeTab === 'SANDBOX'
                    ? 'Phase 2: Engine Sandbox'
                    : 'Phase 1: Contracts Swatch'}
                </span>
              </h1>
              <p className="text-sm text-[#57514A] font-medium mt-1">
                Two-Player Online Auction Cooking Game • Deterministic Pure Engine &amp; Design System
              </p>
            </div>
          </div>
        </div>

        {/* Server Health Badge & Refresh */}
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
                ? `online (Fastify v${healthData?.version ?? '0.1.0'} • ${healthData?.engineVerified ? 'Engine Verified' : 'Checking'})`
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

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <button
          data-testid="tab-harness"
          onClick={() => setActiveTab('HARNESS')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#1E1B18] text-sm font-bold transition shadow-[0_3px_0_#1E1B18] cursor-pointer shrink-0 bg-[#FFB703] text-[#1E1B18] hover:bg-[#f0a900]"
        >
          <Layout className="w-4 h-4 text-[#1E1B18]" />
          <span>Phase 4: Static Screens Harness</span>
        </button>

        <button
          data-testid="tab-live-inspector"
          onClick={() => setActiveTab('INSPECTOR')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#1E1B18] text-sm font-bold transition shadow-[0_3px_0_#1E1B18] cursor-pointer shrink-0 ${
            activeTab === 'INSPECTOR'
              ? 'bg-[#1E1B18] text-[#FFFDF7]'
              : 'bg-[#FFFFFF] text-[#1E1B18] hover:bg-[#F4EFE2]'
          }`}
        >
          <Zap className="w-4 h-4 text-[#FFB703]" />
          <span>Live Dual-Client Inspector</span>
        </button>

        <button
          data-testid="tab-engine-sandbox"
          onClick={() => setActiveTab('SANDBOX')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#1E1B18] text-sm font-bold transition shadow-[0_3px_0_#1E1B18] cursor-pointer shrink-0 ${
            activeTab === 'SANDBOX'
              ? 'bg-[#1E1B18] text-[#FFFDF7]'
              : 'bg-[#FFFFFF] text-[#1E1B18] hover:bg-[#F4EFE2]'
          }`}
        >
          <Cpu className="w-4 h-4 text-[#FFB703]" />
          <span>Engine Sandbox Inspector</span>
        </button>

        <button
          data-testid="tab-contract-diagnostics"
          onClick={() => setActiveTab('CONTRACTS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-[#1E1B18] text-sm font-bold transition shadow-[0_3px_0_#1E1B18] cursor-pointer shrink-0 ${
            activeTab === 'CONTRACTS'
              ? 'bg-[#1E1B18] text-[#FFFDF7]'
              : 'bg-[#FFFFFF] text-[#1E1B18] hover:bg-[#F4EFE2]'
          }`}
        >
          <FileCheck className="w-4 h-4 text-[#1D7A4C]" />
          <span>Contract Diagnostics</span>
        </button>
      </div>

      {activeTab === 'INSPECTOR' ? (
        <DualClientInspector />
      ) : activeTab === 'SANDBOX' ? (
        <EngineSandboxPanel />
      ) : (
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
              Dual-coded with unique high-contrast colors and distinct geometric SVG silhouettes so all players distinguish synergies instantly without relying on color alone.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {flavorTags.map((tag) => {
                const meta = FLAVOR_TAG_META[tag];
                return (
                  <div
                    key={tag}
                    className="p-3.5 rounded-xl bg-[#F4EFE2] border-2 border-[#1E1B18] shadow-[0_2px_0_#1E1B18] flex flex-col justify-between"
                  >
                    <div>
                      <div className="mb-2">
                        <TagPill tag={tag} size="md" />
                      </div>
                      <p className="text-xs font-semibold text-[#1E1B18]">{meta.description}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-[#1E1B18]/15 font-mono text-[10px] text-[#57514A]">
                      {meta.bgHex}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 2: MVP Tiers & Slot Progression */}
          <section
            aria-labelledby="tier-list-heading"
            data-testid="tier-list-section"
            className="bg-[#FFFFFF] p-5 sm:p-6 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18]"
          >
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-6 h-6 text-[#E63946]" />
              <h2 id="tier-list-heading" className="text-xl font-bold font-display text-[#1E1B18]">
                Culinary Tiers &amp; Slot Progression
              </h2>
            </div>
            <p className="text-xs text-[#57514A] mb-4">
              The MVP focuses exclusively on the Street Tier ($20 Burger). Higher tiers unlock in v1.5.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(TIERS).map((t) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-xl border-2 border-[#1E1B18] flex flex-col justify-between shadow-[0_3px_0_#1E1B18] ${
                    t.mvpEnabled ? 'bg-[#FFFDF7] ring-2 ring-[#FFB703]' : 'bg-[#F4EFE2] opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#1E1B18] text-[#FFFDF7]">
                        {t.id}
                      </span>
                      {t.mvpEnabled ? (
                        <span className="text-xs font-bold text-[#1D7A4C] bg-[#1D7A4C]/10 px-2 py-0.5 rounded-full border border-[#1D7A4C]/30">
                          Active MVP
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-[#57514A] bg-[#57514A]/10 px-2 py-0.5 rounded-full border border-[#57514A]/30">
                          v1.5 Tier
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-lg text-[#1E1B18] font-display">
                      {t.name} ({t.dishName})
                    </h3>
                    <div className="flex items-center gap-3 my-2 text-xs font-bold text-[#57514A]">
                      <span className="flex items-center gap-1 text-[#1E1B18]">
                        <Coins className="w-3.5 h-3.5 text-[#FFB703]" />
                        ${t.startingBudget} Budget
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-[#1E1B18]">
                        <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
                        {t.roundsCount} Rounds
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1E1B18]/15">
                    <span className="text-[10px] uppercase font-bold text-[#57514A] block mb-1">
                      Slot Sequence:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {t.slots.map((slot, idx) => (
                        <span
                          key={slot}
                          className="text-[10px] font-mono font-bold bg-[#FFFFFF] px-1.5 py-0.5 rounded border border-[#1E1B18]/30"
                        >
                          {idx + 1}. {slot}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Canonical Street Tier Ingredients */}
          <section
            aria-labelledby="ingredients-heading"
            data-testid="street-ingredients-section"
            className="bg-[#FFFFFF] p-5 sm:p-6 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 id="ingredients-heading" className="text-xl font-bold font-display text-[#1E1B18]">
                  Canonical Street Ingredients ($20 Burger Tier)
                </h2>
                <p className="text-xs text-[#57514A]">
                  19 total ingredients (4 Free Basics, 15 Premium Variants). Filter by slot below:
                </p>
              </div>

              {/* Slot Filter Pill Bar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setSelectedSlot('ALL')}
                  className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold border-2 border-[#1E1B18] transition cursor-pointer flex items-center justify-center ${
                    selectedSlot === 'ALL'
                      ? 'bg-[#1E1B18] text-[#FFFDF7]'
                      : 'bg-[#F4EFE2] text-[#1E1B18] hover:bg-[#FFFDF7]'
                  }`}
                >
                  ALL (19)
                </button>
                {streetSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`min-h-[44px] min-w-[44px] px-2.5 py-2 rounded-xl text-xs font-bold border-2 border-[#1E1B18] transition cursor-pointer flex items-center justify-center ${
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
      )}

      <footer className="mt-12 pt-6 border-t-2 border-[#1E1B18] text-xs font-medium text-[#57514A] flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Bidding Kitchen © 2026 • Phase 4 Design System &amp; Static Screens</span>
        <span className="font-mono text-[11px]">Strict TypeScript • Zero Dependencies • Fastify 5</span>
      </footer>
    </div>
  );
};

export default App;
