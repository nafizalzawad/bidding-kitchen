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
