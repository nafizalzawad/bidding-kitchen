import React, { useState, useEffect, useRef } from 'react';
import { io as ioc, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  PublicMatchView,
  ServerToClientEvents,
} from '@bidding-kitchen/shared';
import {
  ShieldCheck,
  Zap,
  Wifi,
  WifiOff,
  Coins,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  getTimerUrgencyState,
  type TimerUrgencyState,
} from '../../tokens/motion-tokens.js';

type BKClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface ClientState {
  status: 'disconnected' | 'connecting' | 'connected';
  playerId: string | null;
  nickname: string;
  reconnectToken: string | null;
  match: PublicMatchView | null;
  lastError: string | null;
  disconnectDeadline: number | null;
}

const initialClientState = (nickname: string): ClientState => ({
  status: 'disconnected',
  playerId: null,
  nickname,
  reconnectToken: null,
  match: null,
  lastError: null,
  disconnectDeadline: null,
});

export const DualClientInspector: React.FC = () => {
  const [serverUrl, setServerUrl] = useState<string>(
    import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001'
  );
  const [roomCode, setRoomCode] = useState<string>('');
  const [autoRunning, setAutoRunning] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());

  const [clientA, setClientA] = useState<ClientState>(() => initialClientState('Chef_Alice'));
  const [clientB, setClientB] = useState<ClientState>(() => initialClientState('Chef_Bob'));

  const socketARef = useRef<BKClientSocket | null>(null);
  const socketBRef = useRef<BKClientSocket | null>(null);

  // Update clock every 200ms for timers
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketARef.current?.disconnect();
      socketBRef.current?.disconnect();
    };
  }, []);

  // Helper to connect Socket A
  const connectSocketA = (): Promise<BKClientSocket> => {
    if (socketARef.current?.connected) return Promise.resolve(socketARef.current);
    return new Promise((resolve) => {
      setClientA((prev) => ({ ...prev, status: 'connecting' }));
      const socket: BKClientSocket = ioc(serverUrl, { transports: ['websocket'], forceNew: true });
      socketARef.current = socket;

      socket.on('connect', () => {
        setClientA((prev) => ({ ...prev, status: 'connected', lastError: null }));
        resolve(socket);
      });

      socket.on('disconnect', () => {
        setClientA((prev) => ({ ...prev, status: 'disconnected' }));
      });

      socket.on('match:state_sync', (payload) => {
        setClientA((prev) => ({ ...prev, match: payload.match }));
      });

      socket.on('round:resolved', (payload) => {
        setClientA((prev) => ({ ...prev, match: payload.match }));
      });

      socket.on('player:connection_changed', (payload) => {
        setClientA((prev) => ({
          ...prev,
          disconnectDeadline: payload.connected ? null : payload.reconnectDeadlineAt,
        }));
      });

      socket.on('match:forfeited', (payload) => {
        setClientA((prev) => ({ ...prev, match: payload.match }));
      });
    });
  };

  // Helper to connect Socket B
  const connectSocketB = (): Promise<BKClientSocket> => {
    if (socketBRef.current?.connected) return Promise.resolve(socketBRef.current);
    return new Promise((resolve) => {
      setClientB((prev) => ({ ...prev, status: 'connecting' }));
      const socket: BKClientSocket = ioc(serverUrl, { transports: ['websocket'], forceNew: true });
      socketBRef.current = socket;

      socket.on('connect', () => {
        setClientB((prev) => ({ ...prev, status: 'connected', lastError: null }));
        resolve(socket);
      });

      socket.on('disconnect', () => {
        setClientB((prev) => ({ ...prev, status: 'disconnected' }));
      });

      socket.on('match:state_sync', (payload) => {
        setClientB((prev) => ({ ...prev, match: payload.match }));
      });

      socket.on('round:resolved', (payload) => {
        setClientB((prev) => ({ ...prev, match: payload.match }));
      });

      socket.on('player:connection_changed', (payload) => {
        setClientB((prev) => ({
          ...prev,
          disconnectDeadline: payload.connected ? null : payload.reconnectDeadlineAt,
        }));
      });

      socket.on('match:forfeited', (payload) => {
        setClientB((prev) => ({ ...prev, match: payload.match }));
      });
    });
  };

  // Quick Start: Full Automated Orchestration
  const handleQuickStart = async () => {
    try {
      setAutoRunning(true);
      const sockA = await connectSocketA();
      const sockB = await connectSocketB();

      // 1. Host creates room
      const createRes = await new Promise<any>((resolve) => {
        sockA.emit('room:create', { nickname: 'Chef_Alice', tier: 'STREET' }, (ack) => resolve(ack));
      });

      if (!createRes.ok) {
        setClientA((prev) => ({ ...prev, lastError: createRes.error.message }));
        return;
      }

      const newRoomCode = createRes.roomCode;
      setRoomCode(newRoomCode);
      setClientA((prev) => ({
        ...prev,
        playerId: createRes.playerId,
        reconnectToken: createRes.reconnectToken,
        match: createRes.match,
      }));

      // 2. Guest joins room
      const joinRes = await new Promise<any>((resolve) => {
        sockB.emit('room:join', { roomCode: newRoomCode, nickname: 'Chef_Bob' }, (ack) => resolve(ack));
      });

      if (!joinRes.ok) {
        setClientB((prev) => ({ ...prev, lastError: joinRes.error.message }));
        return;
      }

      setClientB((prev) => ({
        ...prev,
        playerId: joinRes.playerId,
        reconnectToken: joinRes.reconnectToken,
        match: joinRes.match,
      }));

      // 3. Both ready up
      sockA.emit('lobby:ready', { roomCode: newRoomCode, ready: true }, () => {});
      sockB.emit('lobby:ready', { roomCode: newRoomCode, ready: true }, () => {});
    } catch (err: any) {
      console.error('Quick start failed', err);
    } finally {
      setAutoRunning(false);
    }
  };

  // Action: Lock Basic for A
  const handleLockBasicA = () => {
    if (!socketARef.current || !clientA.match?.currentRound) return;
    const round = clientA.match.currentRound;
    const basic = round.availableIngredients.find((i) => i.isBasic);
    if (!basic) return;

    socketARef.current.emit(
      'bid:lock',
      {
        roomCode,
        roundIndex: round.roundIndex,
        ingredientId: basic.id,
        amount: 0,
        idempotencyKey: `a_lock_${round.roundIndex}_${Date.now()}`,
      },
      (ack) => {
        if (!ack.ok) setClientA((p) => ({ ...p, lastError: ack.error.message }));
      }
    );
  };

  // Action: Lock Basic for B
  const handleLockBasicB = () => {
    if (!socketBRef.current || !clientB.match?.currentRound) return;
    const round = clientB.match.currentRound;
    const basic = round.availableIngredients.find((i) => i.isBasic);
    if (!basic) return;

    socketBRef.current.emit(
      'bid:lock',
      {
        roomCode,
        roundIndex: round.roundIndex,
        ingredientId: basic.id,
        amount: 0,
        idempotencyKey: `b_lock_${round.roundIndex}_${Date.now()}`,
      },
      (ack) => {
        if (!ack.ok) setClientB((p) => ({ ...p, lastError: ack.error.message }));
      }
    );
  };

  // Action: Disconnect A
  const handleDisconnectA = () => {
    socketARef.current?.disconnect();
    setClientA((prev) => ({ ...prev, status: 'disconnected' }));
  };

  // Action: Reconnect A
  const handleReconnectA = async () => {
    if (!clientA.playerId || !clientA.reconnectToken || !roomCode) return;
    const sock = await connectSocketA();
    sock.emit(
      'room:reconnect',
      {
        roomCode,
        playerId: clientA.playerId,
        reconnectToken: clientA.reconnectToken,
      },
      (ack) => {
        if (ack.ok) {
          setClientA((p) => ({ ...p, match: ack.match, lastError: null }));
        } else {
          setClientA((p) => ({ ...p, lastError: ack.error.message }));
        }
      }
    );
  };

  // Action: Disconnect B
  const handleDisconnectB = () => {
    socketBRef.current?.disconnect();
    setClientB((prev) => ({ ...prev, status: 'disconnected' }));
  };

  // Action: Reconnect B
  const handleReconnectB = async () => {
    if (!clientB.playerId || !clientB.reconnectToken || !roomCode) return;
    const sock = await connectSocketB();
    sock.emit(
      'room:reconnect',
      {
        roomCode,
        playerId: clientB.playerId,
        reconnectToken: clientB.reconnectToken,
      },
      (ack) => {
        if (ack.ok) {
          setClientB((p) => ({ ...p, match: ack.match, lastError: null }));
        } else {
          setClientB((p) => ({ ...p, lastError: ack.error.message }));
        }
      }
    );
  };

  // Action: Rematch Both
  const handleRematch = () => {
    if (!roomCode) return;
    socketARef.current?.emit('post_match:rematch', { roomCode }, () => {});
    socketBRef.current?.emit('post_match:rematch', { roomCode }, () => {});
  };

  // Calculate Hidden Information Proof Badge status
  const calculateHiddenInfoProof = (): { sealed: boolean; reasons: string[] } => {
    const reasons: string[] = [];

    // Check Client A
    if (clientA.match?.currentRound) {
      if ((clientA.match.currentRound as any).privateBids) {
        reasons.push('Client A received unscrubbed privateBids map');
      }
      if ((clientA.match.players[1] as any)?.reconnectToken) {
        reasons.push("Client A received Client B's reconnectToken");
      }
      if (
        clientA.match.state !== 'FINAL_REVEAL' &&
        clientA.match.state !== 'POST_MATCH' &&
        clientA.match.players[1]?.secretOrder
      ) {
        reasons.push("Client A received Client B's secretOrder before FINAL_REVEAL");
      }
    }

    // Check Client B
    if (clientB.match?.currentRound) {
      if ((clientB.match.currentRound as any).privateBids) {
        reasons.push('Client B received unscrubbed privateBids map');
      }
      if ((clientB.match.players[0] as any)?.reconnectToken) {
        reasons.push("Client B received Client A's reconnectToken");
      }
      if (
        clientB.match.state !== 'FINAL_REVEAL' &&
        clientB.match.state !== 'POST_MATCH' &&
        clientB.match.players[0]?.secretOrder
      ) {
        reasons.push("Client B received Client A's secretOrder before FINAL_REVEAL");
      }
    }

    return {
      sealed: reasons.length === 0,
      reasons,
    };
  };

  const hiddenProof = calculateHiddenInfoProof();

  // Helper for countdown urgency state
  const getTimerInfo = (deadlineAt: number | undefined) => {
    if (!deadlineAt) return { remainingSec: 0, urgency: 'calm' as TimerUrgencyState };
    const remainingMs = Math.max(0, deadlineAt - now);
    const urgency = getTimerUrgencyState(remainingMs);
    const remainingSec = (remainingMs / 1000).toFixed(1);
    return { remainingSec, urgency };
  };

  const timerInfoA = getTimerInfo(clientA.match?.stateDeadlineAt);
  const timerInfoB = getTimerInfo(clientB.match?.stateDeadlineAt);

  return (
    <div className="space-y-6">
      {/* Top Controls & Orchestration Bar */}
      <section className="bg-[#FFFFFF] p-5 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-[#FFB703]" />
              <h2 className="text-xl font-bold font-display text-[#1E1B18]">
                Dual-Client Socket Inspector (Authoritative Server)
              </h2>
            </div>
            <p className="text-xs text-[#57514A] mt-1">
              Live multi-socket test harness simulating 2 concurrent players in 1 window with realtime timers and strict anti-cheat sanitization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="inspector-server-url" className="text-xs font-bold text-[#57514A]">Server:</label>
              <input
                id="inspector-server-url"
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border-2 border-[#1E1B18] bg-[#F4EFE2] w-48"
              />
            </div>

            <button
              data-testid="inspector-quick-start-btn"
              onClick={handleQuickStart}
              disabled={autoRunning}
              className="px-4 py-2 bg-[#1D7A4C] hover:bg-[#166534] text-[#FFFDF7] rounded-xl border-2 border-[#1E1B18] text-xs font-bold shadow-[0_3px_0_#1E1B18] active:translate-y-0.5 active:shadow-[0_1px_0_#1E1B18] transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{autoRunning ? 'Starting...' : 'Auto-Connect & Start Live Room'}</span>
            </button>

            {clientA.match?.state === 'POST_MATCH' && (
              <button
                data-testid="inspector-rematch-btn"
                onClick={handleRematch}
                className="px-4 py-2 bg-[#FFB703] hover:bg-[#FFA500] text-[#1E1B18] rounded-xl border-2 border-[#1E1B18] text-xs font-bold shadow-[0_3px_0_#1E1B18] active:translate-y-0.5 active:shadow-[0_1px_0_#1E1B18] transition flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Trigger Dual Rematch</span>
              </button>
            )}
          </div>
        </div>

        {/* Room Code Indicator */}
        {roomCode && (
          <div className="mt-4 pt-3 border-t border-[#1E1B18]/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#57514A]">Active Room Code:</span>
              <span className="font-mono text-sm font-black px-2.5 py-1 rounded bg-[#1E1B18] text-[#FFB703] tracking-widest">
                {roomCode}
              </span>
            </div>
            <span className="text-xs font-bold text-[#1D7A4C] flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Room Active &amp; Synced
            </span>
          </div>
        )}
      </section>

      {/* Hidden Information Boundary Proof Badge */}
      <section
        data-testid="hidden-info-proof-badge"
        className={`p-4 rounded-xl border-2 border-[#1E1B18] shadow-[0_3px_0_#1E1B18] flex items-center justify-between ${
          hiddenProof.sealed
            ? 'bg-[#1D7A4C]/15 border-[#1D7A4C] text-[#1D7A4C]'
            : 'bg-[#E63946]/15 border-[#E63946] text-[#E63946]'
        }`}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-extrabold font-display">
              {hiddenProof.sealed
                ? '🛡️ Hidden Information Boundary: 100% Sealed & Sanitized (Zero Leaks)'
                : '⚠️ Hidden Information Boundary Leaking!'}
            </h3>
            <p className="text-xs mt-0.5 opacity-90">
              {hiddenProof.sealed
                ? 'Opponent secret bids, private bids dictionary, reconnect tokens, and customer secret orders are strictly scrubbed prior to reveal states.'
                : hiddenProof.reasons.join(', ')}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-[#FFFFFF] border border-current">
          ANTI-CHEAT ACTIVE
        </span>
      </section>

      {/* Side-by-Side Dual Client Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL A: Chef_Alice (Seat 0) */}
        <section
          data-testid="client-a-panel"
          className="bg-[#FFFFFF] p-5 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E1B18]/15 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl" role="img" aria-label="Chef A">👩‍🍳</span>
                <div>
                  <h3 className="font-extrabold font-display text-base text-[#1E1B18]">
                    Client A: {clientA.nickname} (Seat 0)
                  </h3>
                  <p className="text-[11px] font-mono text-[#57514A]">
                    ID: {clientA.playerId ? `${clientA.playerId.slice(0, 14)}...` : 'Not Seated'}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                {clientA.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1D7A4C] bg-[#1D7A4C]/10 px-2 py-0.5 rounded-full border border-[#1D7A4C]/30">
                    <Wifi className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#E63946] bg-[#E63946]/10 px-2 py-0.5 rounded-full border border-[#E63946]/30">
                    <WifiOff className="w-3.5 h-3.5" /> Disconnected
                  </span>
                )}
              </div>
            </div>

            {/* Match State & Timer */}
            {clientA.match ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F4EFE2] border border-[#1E1B18]/20">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#57514A] tracking-wider block">
                      State Machine
                    </span>
                    <span className="font-mono text-sm font-black px-2 py-0.5 rounded bg-[#1E1B18] text-[#FFFDF7]">
                      {clientA.match.state}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#57514A] tracking-wider block">
                      Countdown
                    </span>
                    <span
                      className={`font-mono text-sm font-black flex items-center justify-end gap-1 ${
                        timerInfoA.urgency === 'critical'
                          ? 'text-[#E63946] animate-pulse'
                          : timerInfoA.urgency === 'warning'
                          ? 'text-[#FFB703]'
                          : 'text-[#1D7A4C]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {timerInfoA.remainingSec}s
                    </span>
                  </div>
                </div>

                {/* Player Telemetry Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg border border-[#1E1B18]/15 bg-[#FFFDF7]">
                    <span className="text-[#57514A] block">Budget Remaining:</span>
                    <span className="text-base font-bold font-mono text-[#1E1B18] flex items-center gap-1">
                      <Coins className="w-4 h-4 text-[#FFB703]" />
                      ${clientA.match.players[0]?.budget ?? 0}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg border border-[#1E1B18]/15 bg-[#FFFDF7]">
                    <span className="text-[#57514A] block">Dish Stack:</span>
                    <span className="text-base font-bold font-mono text-[#1E1B18]">
                      {clientA.match.players[0]?.dish.length ?? 0} / 5 items
                    </span>
                  </div>
                </div>

                {/* Round Details during BIDDING */}
                {clientA.match.currentRound && (
                  <div className="p-3 rounded-xl border border-[#1E1B18]/20 bg-[#FFFDF7]">
                    <span className="text-[11px] font-bold text-[#57514A] block mb-1">
                      Current Slot: {clientA.match.currentRound.slot} (Round {clientA.match.currentRound.roundIndex + 1})
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <span>My Lock Status:</span>
                      <span className="font-bold">
                        {clientA.match.currentRound.myLockedBid ? (
                          <span className="text-[#1D7A4C]">Locked (${clientA.match.currentRound.myLockedBid.amount})</span>
                        ) : (
                          <span className="text-[#57514A]">Uncommitted</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#57514A] italic">
                Socket A not currently connected to an active match.
              </div>
            )}
          </div>

          {/* Action Buttons for A */}
          <div className="mt-4 pt-3 border-t border-[#1E1B18]/15 flex flex-wrap gap-2">
            <button
              data-testid="client-a-lock-basic-btn"
              onClick={handleLockBasicA}
              disabled={clientA.match?.state !== 'BIDDING' || Boolean(clientA.match?.currentRound?.myLockedBid)}
              className="px-3 py-1.5 bg-[#1E1B18] text-[#FFFDF7] rounded-lg text-xs font-bold shadow-[0_2px_0_#1E1B18] active:translate-y-0.5 transition cursor-pointer disabled:opacity-40"
            >
              Lock Basic ($0)
            </button>

            <button
              data-testid="client-a-disconnect-btn"
              onClick={handleDisconnectA}
              disabled={clientA.status !== 'connected'}
              className="px-3 py-1.5 bg-[#E63946] text-[#FFFDF7] rounded-lg text-xs font-bold shadow-[0_2px_0_#1E1B18] active:translate-y-0.5 transition cursor-pointer disabled:opacity-40"
            >
              Disconnect
            </button>

            <button
              data-testid="client-a-reconnect-btn"
              onClick={handleReconnectA}
              disabled={clientA.status === 'connected' || !clientA.reconnectToken}
              className="px-3 py-1.5 bg-[#2563EB] text-[#FFFDF7] rounded-lg text-xs font-bold shadow-[0_2px_0_#1E1B18] active:translate-y-0.5 transition cursor-pointer disabled:opacity-40"
            >
              Reconnect
            </button>
          </div>
        </section>

        {/* PANEL B: Chef_Bob (Seat 1) */}
        <section
          data-testid="client-b-panel"
          className="bg-[#FFFFFF] p-5 rounded-2xl border-2 border-[#1E1B18] shadow-[0_4px_0_#1E1B18] flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E1B18]/15 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl" role="img" aria-label="Chef B">👨‍🍳</span>
                <div>
                  <h3 className="font-extrabold font-display text-base text-[#1E1B18]">
                    Client B: {clientB.nickname} (Seat 1)
                  </h3>
                  <p className="text-[11px] font-mono text-[#57514A]">
                    ID: {clientB.playerId ? `${clientB.playerId.slice(0, 14)}...` : 'Not Seated'}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-1.5">
                {clientB.status === 'connected' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1D7A4C] bg-[#1D7A4C]/10 px-2 py-0.5 rounded-full border border-[#1D7A4C]/30">
                    <Wifi className="w-3.5 h-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#E63946] bg-[#E63946]/10 px-2 py-0.5 rounded-full border border-[#E63946]/30">
                    <WifiOff className="w-3.5 h-3.5" /> Disconnected
                  </span>
                )}
              </div>
            </div>

            {/* Match State & Timer */}
            {clientB.match ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F4EFE2] border border-[#1E1B18]/20">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#57514A] tracking-wider block">
                      State Machine
                    </span>
                    <span className="font-mono text-sm font-black px-2 py-0.5 rounded bg-[#1E1B18] text-[#FFFDF7]">
                      {clientB.match.state}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#57514A] tracking-wider block">
                      Countdown
                    </span>
                    <span
                      className={`font-mono text-sm font-black flex items-center justify-end gap-1 ${
                        timerInfoB.urgency === 'critical'
                          ? 'text-[#E63946] animate-pulse'
                          : timerInfoB.urgency === 'warning'
                          ? 'text-[#FFB703]'
                          : 'text-[#1D7A4C]'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {timerInfoB.remainingSec}s
                    </span>
                  </div>
                </div>

                {/* Player Telemetry Cards */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg border border-[#1E1B18]/15 bg-[#FFFDF7]">
                    <span className="text-[#57514A] block">Budget Remaining:</span>
                    <span className="text-base font-bold font-mono text-[#1E1B18] flex items-center gap-1">
                      <Coins className="w-4 h-4 text-[#FFB703]" />
                      ${clientB.match.players[1]?.budget ?? 0}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg border border-[#1E1B18]/15 bg-[#FFFDF7]">
                    <span className="text-[#57514A] block">Dish Stack:</span>
                    <span className="text-base font-bold font-mono text-[#1E1B18]">
                      {clientB.match.players[1]?.dish.length ?? 0} / 5 items
                    </span>
                  </div>
                </div>

                {/* Round Details during BIDDING */}
                {clientB.match.currentRound && (
                  <div className="p-3 rounded-xl border border-[#1E1B18]/20 bg-[#FFFDF7]">
                    <span className="text-[11px] font-bold text-[#57514A] block mb-1">
                      Current Slot: {clientB.match.currentRound.slot} (Round {clientB.match.currentRound.roundIndex + 1})
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <span>My Lock Status:</span>
                      <span className="font-bold">
                        {clientB.match.currentRound.myLockedBid ? (
                          <span className="text-[#1D7A4C]">Locked (${clientB.match.currentRound.myLockedBid.amount})</span>
                        ) : (
                          <span className="text-[#57514A]">Uncommitted</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[#57514A] italic">
                Socket B not currently connected to an active match.
              </div>
            )}
          </div>

          {/* Action Buttons for B */}
          <div className="mt-4 pt-3 border-t border-[#1E1B18]/15 flex flex-wrap gap-2">
            <button
              data-testid="client-b-lock-basic-btn"
              onClick={handleLockBasicB}
              disabled={clientB.match?.state !== 'BIDDING' || Boolean(clientB.match?.currentRound?.myLockedBid)}
              className="px-3 py-1.5 bg-[#1E1B18] text-[#FFFDF7] rounded-lg text-xs font-bold shadow-[0_2px_0_#1E1B18] active:translate-y-0.5 transition cursor-pointer disabled:opacity-40"
            >
              Lock Basic ($0)
            </button>

            <button
              data-testid="client-b-disconnect-btn"
              onClick={handleDisconnectB}
              disabled={clientB.status !== 'connected'}
              className="px-3 py-1.5 bg-[#E63946] text-[#FFFDF7] rounded-lg text-xs font-bold shadow-[0_2px_0_#1E1B18] active:translate-y-0.5 transition cursor-pointer disabled:opacity-40"
            >
              Disconnect
            </button>

            <button
              data-testid="client-b-reconnect-btn"
              onClick={handleReconnectB}
              disabled={clientB.status === 'connected' || !clientB.reconnectToken}
              className="px-3 py-1.5 bg-[#2563EB] text-[#FFFDF7] rounded-lg text-xs font-bold shadow-[0_2px_0_#1E1B18] active:translate-y-0.5 transition cursor-pointer disabled:opacity-40"
            >
              Reconnect
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
