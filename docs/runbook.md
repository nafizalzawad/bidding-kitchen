# Bidding Kitchen — Authoritative Realtime Server Operations Runbook

## 1. System Overview & Architecture

Bidding Kitchen runs as an authoritative, room-based multiplayer backend powered by Fastify 5 and Socket.IO 4.
The server maintains single-source-of-truth game state, executes pure deterministic transitions from `@bidding-kitchen/shared`, drives wall-clock timers, and enforces per-player hidden-information sanitization.

### Service Ports & Endpoints
| Component | Default Port | Protocol | Description |
| :--- | :--- | :--- | :--- |
| **Realtime Server** | `3001` | HTTP / WebSocket | Fastify raw HTTP + Socket.IO server |
| **Web Client Dev** | `5173` | HTTP | Vite React development server |
| **Health Check** | `GET /health` | HTTP REST | Uptime, active room count, contract status |
| **Metrics Telemetry** | `GET /metrics` | HTTP REST | Live server runtime counters |
| **Sim Preview** | `POST /api/sim-match` | HTTP REST | Headless 5-round bot match simulator |

---

## 2. Configuration & Environment Variables

| Variable | Default Value | Production Example | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | `3001` | `3001` | TCP port the Fastify server binds to |
| `HOST` | `0.0.0.0` | `0.0.0.0` | Network interface binding |
| `NODE_ENV` | `development` | `production` | Execution mode (`test`, `development`, `production`) |
| `CORS_ORIGIN` | `http://localhost:5173` | `https://play.biddingkitchen.com` | Allowed Web client origin for CORS |

---

## 3. Telemetry & Metrics Monitoring

Query `GET /metrics` on the server to inspect live counters:

```json
{
  "matchesCreated": 42,
  "matchesStarted": 38,
  "matchesCompleted": 35,
  "matchesForfeited": 3,
  "rematchesStarted": 12,
  "tutorialCompletions": 20,
  "bidsLockedTotal": 175,
  "autoTimeoutBidsTotal": 8,
  "roundResolveCount": 175,
  "shareClicks": 14,
  "firstRoundWinnerWins": 21
}
```

### Healthcheck Invariant (`GET /health`)
```json
{
  "status": "ok",
  "version": "0.1.0",
  "activeRooms": 2,
  "sharedContractsLoaded": true,
  "streetIngredientsCount": 19,
  "engineVerified": true
}
```

---

## 4. Incident Response & Troubleshooting

### Scenario A: High Forfeit Rate Spike (`matchesForfeited / matchesStarted > 15%`)
- **Root Cause**: Network instability, aggressive WebSocket disconnections, or client-side crashes during `BIDDING`.
- **Diagnostic Action**:
  1. Inspect server logs for `Socket disconnected` reasons (e.g. `ping timeout`, `transport close`, `transport error`).
  2. Verify client ping interval and ping timeout configuration.
  3. Ensure reverse proxy (NGINX/Cloudflare) supports WebSocket upgrade headers and does not terminate idle connections before `RECONNECT_WINDOW_MS = 30000`.

### Scenario B: Stuck Rooms / Memory Leak (`activeRooms` increases without traffic)
- **Root Cause**: Match rooms failing to self-destroy post-match or upon player departure.
- **Diagnostic Action**:
  1. Check `roomManager.getActiveRoomsCount()`.
  2. Verify that `POST_MATCH` expiry timer (5 minutes / 300,000ms) fires and invokes `this.destroy()`.
  3. Verify `handleDisconnect` cleans up rooms when both players leave `LOBBY`.
  4. Trigger graceful process restart (`kill -SIGTERM <pid>`), which triggers `roomManager.clearAll()`.

### Scenario C: Rate Limiting & Spam Defense
- The server enforces two sliding-window buckets per socket connection:
  - **Room Bucket**: Maximum 10 `room:create` / `room:join` actions per 60,000ms.
  - **Action Bucket**: Maximum 15 actions (`bid:lock`, `lobby:ready`, etc.) per 5,000ms.
- Sockets exceeding these thresholds receive `{ ok: false, error: { code: 'RATE_LIMITED' } }`.

### Scenario D: Graceful Shutdown
When receiving `SIGINT` or `SIGTERM`:
1. Server logs: `Shutting down server gracefully...`
2. `roomManager.clearAll()` clears all active timeouts (`stateTimer`, `biddingTimer`, `reconnectTimer`), preventing dangling node timer handles.
3. Fastify closes all HTTP listeners and disconnects Socket.IO sessions.
4. Process terminates with code 0.

---

## 5. Production Launch Checklist & Rollback Procedure (Phase 7)

### 5.1 Pre-Launch Verification Gates
Before deploying to production, execute the automated verification sequence:
```bash
# 1. Monorepo lint, typecheck, unit tests, bundle budget check
pnpm verify

# 2. 50,000-match balance verification pass
pnpm sim:burger --matches 50000 --seed 2026

# 3. Full multi-browser Playwright E2E and WCAG AA accessibility audit
pnpm test:e2e
```

All 3 gates must exit with code `0`:
- **Balance Gate**: Round 1 winner win-rate strictly within `50.0% – 55.5%`; no variant pick rate `< 5%` or `> 65%`.
- **Accessibility Gate**: Zero WCAG 2.1 AA violations flagged by `@axe-core/playwright`.
- **Bundle Budget Gate**: Total gzipped JS strictly `< 180 KB` (verified via `scripts/check-bundle-budget.mjs`).
- **Security Gate**: Fastify helmet security headers (`nosniff`, `SAMEORIGIN`) active; Socket.IO buffer limit `maxHttpBufferSize: 16384` enforced.

### 5.2 Eight Core Product Metrics (`GET /metrics`)
Monitor these 8 metrics continuously in production:
1. `rematchRate`: Target $\ge 0.40$ ($40\%+$ players play an immediate rematch).
2. `tutorialCompletions`: Total count of players completing the 4-step onboarding overlay.
3. `avgTimeToFirstBidMs`: Target $\le 7000\text{ ms}$ (average time from round start to first locked bid).
4. `firstRoundWinnerWinRate`: Target $0.500 - 0.555$ (validates that Round 1 does not trigger snowballs).
5. `ingredientPickCounts`: Map of pick counts for all 19 Street Burger ingredients (zero unpicked variants).
6. `avgLeftoverMoney`: Average budget unspent per player at match completion (target $\$3.00 - \$10.00$).
7. `disconnectRate`: Target $\le 0.05$ ($< 5\%$ disconnects per match started).
8. `avgRoundResolveMs`: Target $\le 50.0\text{ ms}$ (server round resolution computation duration).

### 5.3 Rollback Procedure
If any of the following occur within 15 minutes of deployment:
- `GET /health` returns status $\ne 200$.
- `GET /metrics` shows `avgRoundResolveMs > 100ms` or `disconnectRate > 15%`.
- High rate of unhandled socket errors in logs.

**Execution Steps**:
1. Trigger immediate container rollback via GitHub Actions (`workflow_dispatch` -> "Rollback to previous release") or manual CLI:
   ```bash
   # Re-tag and promote previous stable release
   docker tag bidding-kitchen-server:stable-prev bidding-kitchen-server:latest
   docker tag bidding-kitchen-web:stable-prev bidding-kitchen-web:latest
   ```
2. Broadcast maintenance notification banner if active sockets persist.
3. Verify `GET /health` on rolled-back cluster.
4. Export server error logs and metrics dump for post-mortem analysis.

