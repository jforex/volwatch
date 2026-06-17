# VWATCH

**A real-time volatility terminal for DeepBook Predict on Sui.**

Live: [volwatch.vercel.app](https://volwatch.vercel.app/) · Backend: [volwatch-production.up.railway.app](https://volwatch-production.up.railway.app)

---

VWATCH reads the DeepBook Predict event stream from Sui testnet, decodes raw SVI calibration parameters, and renders the live implied volatility surface — strike × expiry × IV — alongside vault risk metrics, arbitrage checks, and a scenario simulator. Every number on the screen is computed from on-chain events. No mock data. No interpolation. The protocol speaks; the terminal listens.

Built for the Sui Overflow 2026 hackathon (DeepBook Predict track on DeepSurge).

---

## What it does

VWATCH answers three questions that DeepBook Predict's own UI does not surface:

1. **What does the live vol surface look like?** A 3D Three.js mesh sampling SVI across all active oracles. Smile curves, term structure, skew classification (SMILE / SKEW / SMIRK).
2. **Is the surface arbitrage-free?** Gatheral butterfly conditions on every smile, calendar monotonicity across adjacent expiries. Violations flagged with severity banners.
3. **Is PLP safe?** Vault health summary, utilization zones, withdrawal limiter status, max-payout coverage, oracle freshness, and a ±2/5/10% BTC shock simulator with NAV/P&L projections.

---

## Three dashboards

### Home — Market state at a glance
Dense terminal layout. Status strip with live counters. Insights panel surfacing the top observations (crash skew, term structure shape, vault stress). BTC spot chart with hover crosshair. Event tape showing the latest 10 protocol events.

### Vol Surface — The math
3D vol surface (Three.js, thermal-mapped, rotate + zoom + hover precision marker). Term structure curve (ATM IV vs expiry) with contango/backwardation/flat classification. Skew curve (IV vs log-moneyness, nearest expiry). Arbitrage check panel with severity-tinted alerts. **IV vs Realized Volatility chart** — overlays SVI-derived ATM IV against rolling 10-minute realized vol computed from spot ticks, with IV − RV spread classification (IV RICH / FAIR / DISCOUNT) to signal option-writing edge. Expiry deep-dive showing per-oracle SVI parameters and smile curve. Time travel slider rewinds the entire page up to 30 minutes.

### PLP — Liquidity provider risk
Six panels:
- **Health Summary** — Vault Balance, PLP Supply, NAV/Share, Utilization, Risk Score (synthetic composite), Health Status.
- **Vault Utilization** — current %, capacity threshold zones (idle / healthy / aggressive / stressed), interpretation.
- **Withdrawal Limiter** — available capacity, consumed amount, severity status.
- **Max Payouts** — worst-case payout obligation vs vault size, coverage ratio.
- **Oracle Health** — per-oracle freshness traffic lights, aggregate fresh/stale/no-data counts.
- **Scenario Simulator** — BTC ±2/5/10% shocks → projected Vault P&L, NAV, Utilization, Max Payout.
- **Risk Exposure Heatmap** — strike × expiry grid showing per-oracle net call/put exposure across the vault. Reads `vault.oracle_matrices` Table on-chain via dynamic-field walk + per-oracle expiry enrichment. Cells colored green (vault short calls — rally risk) or red (vault short puts — drop risk), intensity = magnitude.

---

## Architecture

DeepBook Predict (Sui testnet)

│

│  event stream (prices, svi, activated, settled)

▼

┌──────────────────┐

│  Backend (TS)    │  Subscribes to Sui events, mirrors oracle state,

│  Railway         │  polls vault snapshot every 5s, captures rolling

│                  │  30-min history buffer for time travel.

└─────────┬────────┘

│  WebSocket

▼

┌──────────────────┐

│  Frontend (Next) │  Decodes SVI params, computes implied vols, renders

│  Vercel          │  3D mesh, charts, dashboards. Shared Context across

│                  │  /app/home, /app/surface, /app/plp.

└──────────────────┘

### Data sourcing — on-chain only

Every metric in VWATCH derives from Sui/DeepBook Predict directly:

- **Raw on-chain events**: `prices`, `svi`, `activated`, `settled`
- **Vault state**: polled directly from the Predict object on-chain (balance, PLP supply, utilization, exposure ceiling, withdrawal limiter)
- **Derived metrics** (computed by VWATCH from raw inputs): ATM IV, smile curves, term structure, butterfly + calendar arb checks, surface explainer text, risk score, scenario projections

Two synthetic composites are clearly labeled in the UI:
- **Risk Score (0-100)**: weighted average of utilization ratio, payout coverage, and withdrawal pressure. Labeled "composite · synthetic" in the Health Summary.
- **Scenario Simulator projections**: aggregate-sensitivity heuristic. Per-position re-pricing is not modeled. The methodology disclosure inside the panel explains every assumption.

There are no external price feeds, no oracle aggregators, no mock data anywhere.

---

## The math — SVI calibration

DeepBook Predict emits SVI calibration parameters `(a, b, m, ρ, σ)` per oracle. VWATCH decodes these and computes implied vol via the standard SVI form:

w(k) = a + b · (ρ · (k - m) + √((k - m)² + σ²))

Where `k = log(K/F)` is log-moneyness, `K` is strike, `F` is the forward price.

**Important calibration note**: Predict's SVI returns *variance per unit time* (annualized IV²), not total variance over [0, T]. So implied vol is `σ_IV = √w(k)`, not `√(w(k)/T)`. This was determined empirically from oracle params on testnet. The math lives in `web/app/lib/svi.ts`.

### Arbitrage checks

- **Butterfly (Gatheral's g(k))**: For each smile, we verify the no-arb condition `g(k) ≥ 0` across the strike range. If violated, calls and puts at certain strikes would have a state-price density that goes negative — a free-lunch arbitrage. Implementation: `web/app/lib/arbitrage.ts`.
- **Calendar monotonicity**: For each adjacent expiry pair, total variance `w(k)` must be non-decreasing in T at every strike. A violation means buying a longer-dated option and selling a shorter-dated one at the same strike yields free convexity. We check the worst-case strike across the smile range.

Both checks classify as `ok`, `warn`, or `violation` with calibrated thresholds.

---

## Tech stack

**Frontend**
- Next.js 16 (App Router, Turbopack)
- TypeScript
- Tailwind CSS v4
- Framer Motion (landing animations)
- Recharts (term structure, skew, smile, spot charts)
- Three.js + react-three-fiber + drei (3D vol surface)

**Backend**
- Node.js + TypeScript
- `@mysten/sui` for Sui event subscriptions and object reads
- WebSocket (ws) for streaming to the frontend
- Rolling history buffer for time travel (30 min, 5s sample rate)

**Infrastructure**
- Frontend on Vercel
- Backend on Railway
- Sui testnet RPC (DeepBook Predict package)

---

## Running locally

Prerequisites: Node 20+, npm.

```bash
git clone https://github.com/jforex/volwatch
cd volwatch
```

### Backend

```bash
cd server
npm install
npm start
```

The backend subscribes to Sui testnet, mirrors oracle state, and listens on WebSocket port 8080 by default.

### Frontend

In a second terminal:

```bash
cd web
npm install
npm run dev
```

Open `http://localhost:3000`.

### Environment variables

For local dev the defaults work out of the box. For deployment:

- `web/.env`: `NEXT_PUBLIC_WS_URL` — backend WebSocket URL (defaults to `ws://localhost:8080` in dev).
- `server/.env`: Sui RPC endpoint and Predict package/object IDs (defaults to testnet values in code).

---

## Protocol IDs (Sui testnet)

- **Predict package**: `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138`
- **Predict object**: `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a`
- **Quote token**: `dusdc::DUSDC`
- **PLP token**: `plp::PLP`

---


## Embeddable widgets

VWATCH ships with three drop-in widgets that any Sui frontend can embed via `<iframe>`. No SDK, no API key, no host-side build step. Each widget streams live SVI updates from DeepBook Predict directly.

**Available widgets:**

| Widget | URL | Recommended height |
|--------|-----|-------------------|
| 3D Vol Surface | `https://volwatch.vercel.app/embed/vol-surface` | 540px |
| Skew Curve | `https://volwatch.vercel.app/embed/skew` | 380px |
| PLP Health | `https://volwatch.vercel.app/embed/plp-health` | 280px |

**Example embed:**

```html
<iframe
  src="https://volwatch.vercel.app/embed/vol-surface"
  width="100%"
  height="540"
  frameborder="0"
  allow="fullscreen"
  style="border-radius: 8px; border: 1px solid #262626;"
></iframe>
```

**Full docs + live previews + copy-paste snippets:** [volwatch.vercel.app/embed](https://volwatch.vercel.app/embed)

---

## Roadmap

- **Expanded alert types**: butterfly arbitrage violations, calendar monotonicity failures, PLP utilization thresholds, oracle staleness — all as global stream alerts in the same tray.
- **Personalized alert preferences via zkLogin (Enoki)**: opt-in alert subscriptions per user. Pick which oracles, which alert types, which severity thresholds. Sessions via zkLogin so it stays Sui-native — no Web2 email/password.
- **Per-position exposure breakdown**: would require additional backend instrumentation to expose `strikeMatrices` data from the vault.
- **Drawdown history**: NAV time series persisted to disk for 30/90-day drawdown analytics. Currently we only have the rolling 30-min in-memory buffer.
- **Cross-venue spread monitor**: VWATCH vs external venues. Cut from v1 because it would break the on-chain-only sourcing claim. Considered for a separate "research mode."

---

## Author

Christian — frontend dev based in Port Harcourt, Nigeria. Building across Web3, fintech, and AI product spaces.

GitHub: [@jforex](https://github.com/jforex)

---

## License

MIT