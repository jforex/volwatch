<div align="center">

<img src="web/public/logo.png" alt="VolWatch" width="160" />

# VolWatch

**Real-time volatility terminal for DeepBook Predict.**

Live smile curves · on-chain vault risk · arbitrage detection · trader-readable explanations — all from real Sui events.

*Built for Sui Overflow 2026 · DeepBook Predict track*

</div>

---

## What it does

VolWatch decodes DeepBook Predict's volatility surface tick-by-tick and renders it as a Bloomberg-style terminal. Every number on screen is read directly from Sui testnet — no mock data, no interpolation.

**Five live modules:**

| Module | What it shows |
|---|---|
| **Vol Smile Viewer** | Decodes Predict's SVI parameters (a, b, m, ρ, σ) from on-chain events and renders the live implied vol smile per expiry. Click any oracle to focus. |
| **PLP Risk Dashboard** | Vault balance, PLP supply, NAV per share, max payout liability, and utilization — all read directly from the Predict object on-chain every 10s. |
| **Arbitrage Detection** | Runs Gatheral's butterfly arb-free condition on every smile and checks calendar monotonicity across expiries. Flags violations the protocol itself doesn't surface. |
| **Term Structure View** | Live oracle list sorted by expiry, each showing ATM IV. See contango, backwardation, and skew shifts instantly across all active expiries. |
| **Surface Explainer** | Plain-English observations of what a trader should notice right now: crash skew, term structure shape, vault stress, arb violations. Updates live. |

---

## Why it matters

DeepBook Predict ships institutional-grade options pricing to Sui. The protocol emits ~50 events every 3 seconds — spot updates, SVI surface updates, oracle activations, settlements. Reading those events as a human is impossible. Reading them as a trader needs a terminal.

VolWatch is that terminal. It exists because:

- **Vol surfaces are the heartbeat of options markets.** If you can't see the surface, you can't trust the pricing.
- **LPs need visibility into vault risk in real time.** PLP holders are taking the other side of every binary position; they deserve to see exposure, utilization, and NAV without parsing on-chain objects themselves.
- **Arbitrage-free conditions are a data-quality signal.** If a smile fails Gatheral's butterfly test, the protocol's SVI fit is degenerate at that expiry. That matters to both traders and the protocol team.

---

## Architecture

**Backend** (`server/`):
- Polls Predict's `oracle` module events every 3s (cursor-based, normalized to typed events)
- Polls the Predict object via `getObject` every 10s for vault state
- Fans out everything via WebSocket to any connected frontend
- Backfills recent history on startup so new clients render immediately

**Frontend** (`web/`):
- Next.js 16 + React + Tailwind
- `useVolStream` hook maintains live state per oracle
- Pure SVI math in `lib/svi.ts` (calibrated against actual on-chain params)
- Recharts for every chart, components organized per module

### SVI math note

Predict's `OracleSVIUpdated` events emit the surface as 5 numbers (a, b, m, ρ, σ) in fixed-point. Empirically:

- `a, b, m, σ` are scaled at 1e6
- `ρ` is scaled at 1e9 (so it lands in [-1, 1])
- `w(k) = a + b · (ρ(k-m) + sqrt((k-m)² + σ²))` is **per-unit-time variance** (annualized IV²), not standard total variance. So IV at strike K equals `sqrt(w(ln(K/F)))`, not `sqrt(w/T)`.

This was inferred from real testnet params and verified against expected BTC short-dated IV ranges. See `web/app/lib/svi.ts`.

---

## On-chain references (testnet)

| | |
|---|---|
| Predict package | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138` |
| Predict object | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` |
| Predict registry | `0x43af14fed5480c20ff77e2263d5f794c35b9fab7e2212903127062f4fe2a6e64` |
| Quote asset | `dusdc::DUSDC` (6 decimals) |
| PLP coin | `plp::PLP` |
| Public indexer | `https://predict-server.testnet.mystenlabs.com` |

Events consumed: `OraclePricesUpdated`, `OracleSVIUpdated`, `OracleActivated`, `OracleSettled`.

---

## Run locally

**Requirements:** Node 20+, npm.

Clone:

    git clone https://github.com/jforex/volwatch.git
    cd volwatch

**Backend** (terminal 1):

    cd server
    npm install
    npm run dev

You should see oracle events streaming within seconds. WebSocket listens on `ws://localhost:8080`.

**Frontend** (terminal 2):

    cd web
    npm install
    npm run dev

Open http://localhost:3000 for the landing page, or http://localhost:3000/app for the terminal directly.

No wallet, no API keys, no environment variables required. The terminal reads Sui testnet on its own.

---

## Project structure

    volwatch/
    ├── server/
    │   └── src/index.ts         # Event poll + vault poll + WebSocket fan-out
    └── web/
        └── app/
            ├── page.tsx                          # Landing page
            ├── app/page.tsx                      # Terminal dashboard
            ├── lib/
            │   ├── useVolStream.ts               # Live state hook
            │   ├── svi.ts                        # Pure SVI math
            │   ├── arbitrage.ts                  # Butterfly + calendar checks
            │   ├── explainer.ts                  # Deterministic surface narrator
            │   └── format.ts                     # USD, time, ID helpers
            └── components/
                ├── SpotSparkline.tsx             # Live BTC mini-chart
                ├── SmileChart.tsx                # Per-oracle IV smile
                ├── OracleList.tsx                # Term structure view
                ├── PLPDashboard.tsx              # Vault risk module
                ├── ArbCheck.tsx                  # Arb-free condition checks
                └── SurfaceExplainer.tsx          # Trader-readable observations

---

## What's next

- **Time-travel slider** to replay the last hour of surface state
- **Three.js 3D surface viewer** for full strike × expiry visualization
- **LLM-powered surface narration** (Claude API) as an upgrade to the deterministic explainer
- **Multi-underlying support** once Predict adds ETH / SOL oracles on testnet (architecture is already asset-agnostic)
- **Mainnet support** when Predict launches V1 later in 2026

---

## License

MIT.

---

<div align="center">

Built with care for Sui Overflow 2026.

</div>