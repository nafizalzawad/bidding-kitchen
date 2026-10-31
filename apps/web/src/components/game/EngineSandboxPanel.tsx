import React, { useState, useMemo } from 'react';
import {
  createBot,
  simulateSingleMatch,
  createMatch,
  addPlayerToMatch,
  startRound,
  resolveRound,
  finalizeMatch,
  type BotArchetype,
  type Match,
  type Result,
  type Bid,
} from '@bidding-kitchen/shared';

export const EngineSandboxPanel: React.FC = () => {
  const [seed, setSeed] = useState<number>(2026);
  const [botA, setBotA] = useState<BotArchetype>('COMBO');
  const [botB, setBotB] = useState<BotArchetype>('GREEDY');

  // Simulation state
  const [simState, setSimState] = useState<{ match: Match; result: Result }>(() => {
    const bA = createBot('bot_p0', 'Chef A (Combo)', 'COMBO');
    const bB = createBot('bot_p1', 'Chef B (Greedy)', 'GREEDY');
    return simulateSingleMatch(bA, bB, 2026);
  });

  const handleSimulate = () => {
    const bA = createBot('bot_p0', `Chef A (${botA})`, botA);
    const bB = createBot('bot_p1', `Chef B (${botB})`, botB);
    const output = simulateSingleMatch(bA, bB, seed);
    setSimState(output);
  };

  const handlePresetCollision = () => {
    let match = createMatch({ seed });
    match = addPlayerToMatch(match, { id: 'bot_p0', nickname: 'Chef A' });
    match = addPlayerToMatch(match, { id: 'bot_p1', nickname: 'Chef B' });

    // Round 0 (BUN) - uncontested
    match = startRound(match, 0);
    const res0 = resolveRound(match, [
      { playerId: 'bot_p0', roundIndex: 0, ingredientId: 'street_bun_brioche', amount: 4, lockedAt: 100, isAutoTimeoutBid: false },
      { playerId: 'bot_p1', roundIndex: 0, ingredientId: 'street_bun_sesame', amount: 2, lockedAt: 100, isAutoTimeoutBid: false },
    ]);
    match = res0.updatedMatch;

    // Round 1 (PATTY) - COLLISION ON WAGYU ($8)
    match = startRound(match, 1);
    const res1 = resolveRound(match, [
      { playerId: 'bot_p0', roundIndex: 1, ingredientId: 'street_patty_wagyu', amount: 9, lockedAt: 100, isAutoTimeoutBid: false },
      { playerId: 'bot_p1', roundIndex: 1, ingredientId: 'street_patty_wagyu', amount: 8, lockedAt: 100, isAutoTimeoutBid: false },
    ]);
    match = res1.updatedMatch;

    // Complete remaining rounds
    for (let r = 2; r < 5; r++) {
      match = startRound(match, r);
      const b0 = match.rounds[r]!.availableIngredients[0]!;
      const b1 = match.rounds[r]!.availableIngredients[1] ?? b0;
      const rBids: [Bid, Bid] = [
        { playerId: 'bot_p0', roundIndex: r, ingredientId: b0.id, amount: b0.basePrice, lockedAt: 100, isAutoTimeoutBid: false },
        { playerId: 'bot_p1', roundIndex: r, ingredientId: b1.id, amount: b1.basePrice, lockedAt: 100, isAutoTimeoutBid: false },
      ];
      match = resolveRound(match, rBids).updatedMatch;
    }

    match = finalizeMatch(match);
    setSimState({ match, result: match.result! });
  };

  const handlePresetTiebreak = () => {
    let match = createMatch({ seed });
    match = addPlayerToMatch(match, { id: 'bot_p0', nickname: 'Chef A' });
    match = addPlayerToMatch(match, { id: 'bot_p1', nickname: 'Chef B' });

    // Round 0
    match = startRound(match, 0);
    match = resolveRound(match, [
      { playerId: 'bot_p0', roundIndex: 0, ingredientId: 'street_bun_plain', amount: 0, lockedAt: 100, isAutoTimeoutBid: false },
      { playerId: 'bot_p1', roundIndex: 0, ingredientId: 'street_bun_plain', amount: 0, lockedAt: 100, isAutoTimeoutBid: false },
    ]).updatedMatch;

    // Round 1
    match = startRound(match, 1);
    match = resolveRound(match, [
      { playerId: 'bot_p0', roundIndex: 1, ingredientId: 'street_patty_wagyu', amount: 8, lockedAt: 100, isAutoTimeoutBid: false },
      { playerId: 'bot_p1', roundIndex: 1, ingredientId: 'street_patty_basic', amount: 0, lockedAt: 100, isAutoTimeoutBid: false },
    ]).updatedMatch;

    // Round 2 - Collision on Truffle Aioli ($3) with budget tiebreak
    // p0 budget: 12, p1 budget: 20 -> p1 wins tiebreak
    match = startRound(match, 2);
    match = resolveRound(match, [
      { playerId: 'bot_p0', roundIndex: 2, ingredientId: 'street_sauce_truffle', amount: 3, lockedAt: 100, isAutoTimeoutBid: false },
      { playerId: 'bot_p1', roundIndex: 2, ingredientId: 'street_sauce_truffle', amount: 3, lockedAt: 100, isAutoTimeoutBid: false },
    ]).updatedMatch;

    for (let r = 3; r < 5; r++) {
      match = startRound(match, r);
      const b0 = match.rounds[r]!.availableIngredients[0]!;
      match = resolveRound(match, [
        { playerId: 'bot_p0', roundIndex: r, ingredientId: b0.id, amount: b0.basePrice, lockedAt: 100, isAutoTimeoutBid: false },
        { playerId: 'bot_p1', roundIndex: r, ingredientId: b0.id, amount: b0.basePrice, lockedAt: 100, isAutoTimeoutBid: false },
      ]).updatedMatch;
    }

    match = finalizeMatch(match);
    setSimState({ match, result: match.result! });
  };

  const p0 = simState.match.players[0]!;
  const p1 = simState.match.players[1]!;
  const scoreA = simState.result.scoresByPlayer[p0.id];
  const scoreB = simState.result.scoresByPlayer[p1.id];

  const winnerName = useMemo(() => {
    if (!simState.result.winnerId) return 'Tie';
    return simState.result.winnerId === p0.id ? p0.nickname : p1.nickname;
  }, [simState.result.winnerId, p0, p1]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-bk-card border border-bk-border rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-bk-text tracking-wide">
                Engine Sandbox Inspector
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Pure Deterministic Rules
              </span>
            </div>
            <p className="text-sm text-bk-muted mt-1">
              Step through 5-round auction bidding, collision resolutions, tiebreak fallbacks, and score calculations.
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-bk-muted mb-1">
              PRNG Seed
            </label>
            <input
              type="number"
              data-testid="sim-seed-input"
              value={seed}
              onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-bk-bg border border-bk-border rounded-lg px-3 py-1.5 text-sm font-mono text-bk-text focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-bk-muted mb-1">
              Player A Archetype
            </label>
            <select
              data-testid="sim-bot-a-select"
              value={botA}
              onChange={(e) => setBotA(e.target.value as BotArchetype)}
              className="w-full bg-bk-bg border border-bk-border rounded-lg px-3 py-1.5 text-sm text-bk-text focus:outline-none focus:border-amber-400"
            >
              <option value="COMBO">COMBO (Tag Synergy)</option>
              <option value="GREEDY">GREEDY (Highest Taste)</option>
              <option value="RANDOM">RANDOM (Uniform)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-bk-muted mb-1">
              Player B Archetype
            </label>
            <select
              data-testid="sim-bot-b-select"
              value={botB}
              onChange={(e) => setBotB(e.target.value as BotArchetype)}
              className="w-full bg-bk-bg border border-bk-border rounded-lg px-3 py-1.5 text-sm text-bk-text focus:outline-none focus:border-amber-400"
            >
              <option value="GREEDY">GREEDY (Highest Taste)</option>
              <option value="COMBO">COMBO (Tag Synergy)</option>
              <option value="RANDOM">RANDOM (Uniform)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              data-testid="btn-simulate-match"
              onClick={handleSimulate}
              className="w-full bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-bold px-4 py-2 rounded-lg text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Simulate Match</span>
            </button>
          </div>
        </div>

        {/* Quick Test Presets */}
        <div className="mt-3 pt-3 border-t border-bk-border/60 flex flex-wrap items-center gap-2">
          <span className="text-xs text-bk-muted font-medium">Collision Presets:</span>
          <button
            data-testid="btn-test-collision"
            onClick={handlePresetCollision}
            className="text-xs px-2.5 py-1 bg-bk-bg hover:bg-bk-border/40 border border-bk-border rounded-md text-amber-300 font-medium transition-colors"
          >
            ⚡ Test Collision ($8 Wagyu)
          </button>
          <button
            data-testid="btn-test-tiebreak"
            onClick={handlePresetTiebreak}
            className="text-xs px-2.5 py-1 bg-bk-bg hover:bg-bk-border/40 border border-bk-border rounded-md text-purple-300 font-medium transition-colors"
          >
            ⚖️ Test Budget Tiebreak ($3 Truffle)
          </button>
        </div>
      </div>

      {/* Match Result Banner */}
      <div className="bg-gradient-to-r from-amber-500/15 via-bk-card to-purple-500/15 border border-amber-500/30 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🏆</span>
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-amber-400">Match Winner</span>
                <h3 data-testid="match-winner-badge" className="text-xl font-black text-bk-text">
                  {winnerName}
                </h3>
              </div>
              <span
                data-testid="match-winner-title"
                className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30"
              >
                {simState.result.winnerTitle}
              </span>
            </div>
            <p className="text-sm text-bk-muted mt-2 font-medium">
              {simState.result.keyMomentText}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-bk-muted uppercase font-bold tracking-wider">Win Reason</span>
            <div className="text-sm font-mono font-bold text-emerald-400">
              {simState.result.winReason}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Final Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Player 0 Card */}
        <div className="bg-bk-card border border-bk-border rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-bk-border">
            <div>
              <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Seat 0</span>
              <h4 className="font-bold text-bk-text">{p0.nickname}</h4>
              <p data-testid="p0-dish-name" className="text-xs text-bk-muted italic mt-0.5">
                "{scoreA?.generatedDishName}"
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-bk-muted uppercase">Final Score</span>
              <div data-testid="p0-final-score" className="text-3xl font-black text-amber-400 font-mono">
                {scoreA?.finalScore}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-bk-bg/60 p-2 rounded-lg border border-bk-border/40">
              <span className="text-bk-muted block">Taste Points</span>
              <span className="text-sm font-bold font-mono text-bk-text">{scoreA?.tastePoints}</span>
            </div>
            <div className="bg-bk-bg/60 p-2 rounded-lg border border-bk-border/40">
              <span className="text-bk-muted block">Combos Bonus</span>
              <span className="text-sm font-bold font-mono text-bk-text">+{scoreA?.comboPoints}</span>
            </div>
            <div className="bg-bk-bg/60 p-2 rounded-lg border border-bk-border/40">
              <span className="text-bk-muted block">Order Bonus</span>
              <span className="text-sm font-bold font-mono text-bk-text">+{scoreA?.orderBonusPoints}</span>
            </div>
            <div className="bg-bk-bg/60 p-2 rounded-lg border border-bk-border/40">
              <span className="text-bk-muted block">Leftover Money</span>
              <span className="text-sm font-bold font-mono text-bk-text">+{scoreA?.leftoverMoneyBonus} (${scoreA?.leftoverBudget})</span>
            </div>
          </div>

          {scoreA && scoreA.combos.length > 0 && (
            <div className="mt-3 pt-3 border-t border-bk-border/40 flex flex-wrap gap-1.5">
              {scoreA.combos.map((c) => (
                <span
                  key={c.id}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20"
                >
                  ✨ {c.name} (+{c.points})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Player 1 Card */}
        <div className="bg-bk-card border border-bk-border rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-bk-border">
            <div>
              <span className="text-xs text-purple-400 font-bold uppercase tracking-wider">Seat 1</span>
              <h4 className="font-bold text-bk-text">{p1.nickname}</h4>
              <p data-testid="p1-dish-name" className="text-xs text-bk-muted italic mt-0.5">
                "{scoreB?.generatedDishName}"
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-bk-muted uppercase">Final Score</span>
              <div data-testid="p1-final-score" className="text-3xl font-black text-purple-400 font-mono">
                {scoreB?.finalScore}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-bk-bg/60 p-2 rounded-lg border border-bk-border/40">
              <span className="text-bk-muted block">Taste Points</span>
              <span className="text-sm font-bold font-mono text-bk-text">{scoreB?.tastePoints}</span>
            </div>
            <div className="bg-bk-bg/60 p-2 rounded-lg border border-bk-border/40">
              <span className="text-bk-muted block">Combos Bonus</span>
              <span className="text-sm font-bold font-mono text-bk-text">+{scoreB?.comboPoints}</span>
            </div>
            <div className="bg-bk-bg/60 p-2 rounded-lg border border-bk-border/40">
              <span className="text-bk-muted block">Order Bonus</span>
              <span className="text-sm font-bold font-mono text-bk-text">+{scoreB?.orderBonusPoints}</span>
            </div>
            <div className="bg-bk-bg/60 p-2 rounded-lg border border-bk-border/40">
              <span className="text-bk-muted block">Leftover Money</span>
              <span className="text-sm font-bold font-mono text-bk-text">+{scoreB?.leftoverMoneyBonus} (${scoreB?.leftoverBudget})</span>
            </div>
          </div>

          {scoreB && scoreB.combos.length > 0 && (
            <div className="mt-3 pt-3 border-t border-bk-border/40 flex flex-wrap gap-1.5">
              {scoreB.combos.map((c) => (
                <span
                  key={c.id}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20"
                >
                  ✨ {c.name} (+{c.points})
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5 Round Resolution Breakdown Cards */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-bk-muted">
          Round-by-Round Bidding & Collision Log
        </h3>

        {simState.match.rounds.map((round, idx) => {
          const res = round.resolution;
          if (!res) return null;

          const award0 = res.awardsByPlayer[p0.id];
          const award1 = res.awardsByPlayer[p1.id];
          const bid0 = res.bidsByPlayer[p0.id];
          const bid1 = res.bidsByPlayer[p1.id];

          const isCollision = res.outcomeType !== 'NO_COLLISION';

          let collisionBadgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
          let collisionBadgeText = 'Clear Win (No Collision)';

          if (res.outcomeType === 'COLLISION_HIGH_BID') {
            collisionBadgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
            collisionBadgeText = '⚡ Collision: High Bid Win';
          } else if (res.outcomeType === 'COLLISION_TIE_BUDGET') {
            collisionBadgeClass = 'bg-purple-500/15 text-purple-400 border-purple-500/30';
            collisionBadgeText = '⚖️ Collision: Budget Tiebreak';
          } else if (res.outcomeType === 'COLLISION_TIE_COINFLIP') {
            collisionBadgeClass = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
            collisionBadgeText = '🪙 Collision: Coinflip Tiebreak';
          }

          return (
            <div
              key={idx}
              data-testid={`round-card-${idx}`}
              className={`bg-bk-card border rounded-xl p-4 transition-all ${
                isCollision ? 'border-amber-500/40 shadow-sm' : 'border-bk-border'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-bk-border/60">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-bk-bg text-amber-400 border border-bk-border">
                    R{idx + 1}
                  </span>
                  <span className="font-bold text-sm text-bk-text tracking-wide">
                    {round.slot}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${collisionBadgeClass}`}>
                    {collisionBadgeText}
                  </span>
                  {res.chefsTipAwardedToPlayerId && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      👨‍🍳 Chef's Tip +$2
                    </span>
                  )}
                </div>
              </div>

              {/* Side-by-Side Round Details */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* P0 Round Outcome */}
                <div className="bg-bk-bg/50 p-3 rounded-lg border border-bk-border/30">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-amber-300">{p0.nickname}</span>
                    <span className="font-mono text-bk-muted">
                      ${res.budgetsBeforeRound[p0.id]} → ${res.budgetsAfterRound[p0.id]}
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-bk-muted">Bid:</span>
                      <span className="font-mono font-medium text-bk-text">
                        {bid0?.ingredientId.replace('street_', '')} @ ${bid0?.amount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bk-muted">Awarded:</span>
                      <span className="font-medium text-emerald-400">
                        {award0?.ingredient.name} (-${award0?.pricePaid})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bk-muted">Won Via:</span>
                      <span className="font-mono text-[11px] text-bk-muted">
                        {award0?.wonVia}
                      </span>
                    </div>
                  </div>
                </div>

                {/* P1 Round Outcome */}
                <div className="bg-bk-bg/50 p-3 rounded-lg border border-bk-border/30">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-purple-300">{p1.nickname}</span>
                    <span className="font-mono text-bk-muted">
                      ${res.budgetsBeforeRound[p1.id]} → ${res.budgetsAfterRound[p1.id]}
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-bk-muted">Bid:</span>
                      <span className="font-mono font-medium text-bk-text">
                        {bid1?.ingredientId.replace('street_', '')} @ ${bid1?.amount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bk-muted">Awarded:</span>
                      <span className="font-medium text-emerald-400">
                        {award1?.ingredient.name} (-${award1?.pricePaid})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bk-muted">Won Via:</span>
                      <span className="font-mono text-[11px] text-bk-muted">
                        {award1?.wonVia}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
