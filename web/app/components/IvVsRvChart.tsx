"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { HistoryFrame } from "../lib/useVolStream";
import { totalVariance } from "../lib/svi";

type Props = {
  history: HistoryFrame[];
  spotHistory: { ts: number; spot: number }[];
};

type Point = {
  ts: number;
  iv: number | null;
  rv: number | null;
};

// Realized vol from a spot series. Returns annualized vol or null if not enough samples.
function computeRV(spotSeries: { ts: number; spot: number }[]): number | null {
  if (spotSeries.length < 6) return null;

  const returns: number[] = [];
  let totalDtMs = 0;
  for (let i = 1; i < spotSeries.length; i++) {
    const prev = spotSeries[i - 1];
    const curr = spotSeries[i];
    if (prev.spot <= 0 || curr.spot <= 0) continue;
    const r = Math.log(curr.spot / prev.spot);
    returns.push(r);
    totalDtMs += curr.ts - prev.ts;
  }
  if (returns.length < 5 || totalDtMs <= 0) return null;

  // Sample variance
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(1, returns.length - 1);

  // Time per sample, then scale to annualized
  const avgDtMs = totalDtMs / returns.length;
  const samplesPerYear = (365.25 * 24 * 3600 * 1000) / avgDtMs;
  const annualizedVar = variance * samplesPerYear;
  return Math.sqrt(Math.max(0, annualizedVar));
}

// ATM IV from an oracle's SVI parameters: σ_IV = sqrt(w(0))
function atmIvFromFrame(frame: HistoryFrame): number | null {
  if (!frame.oracles || frame.oracles.length === 0) return null;
  // Only consider oracles whose expiry is known AND in the future relative to this frame
  const candidates = frame.oracles
    .filter((o) => o.svi && o.forward && o.expiryMs && o.expiryMs > frame.ts)
    .sort((a, b) => (a.expiryMs ?? 0) - (b.expiryMs ?? 0));
  if (candidates.length === 0) return null;
  const o = candidates[0];
  if (!o.svi || !o.expiryMs) return null;
const w = totalVariance(o.svi, 0);
  if (w <= 0) return null;
  return Math.min(Math.sqrt(w), 2); // cap at 200% (display in fraction form)
}

export function IvVsRvChart({ history, spotHistory }: Props) {
  const { points, currentIv, currentRv, spread } = useMemo(() => {
    if (history.length === 0) {
      return { points: [] as Point[], currentIv: null as number | null, currentRv: null as number | null, spread: null as number | null };
    }

    // RV windowing: at each history frame ts, compute RV over [ts - 10min, ts] from spotHistory
    const RV_WINDOW_MS = 10 * 60 * 1000;

    const pts: Point[] = [];
    for (const frame of history) {
      const iv = atmIvFromFrame(frame);
      const windowStart = frame.ts - RV_WINDOW_MS;
      const slice = spotHistory.filter((s) => s.ts >= windowStart && s.ts <= frame.ts);
      const rv = computeRV(slice);
      pts.push({ ts: frame.ts, iv, rv });
    }

    // Latest non-null IV and RV from the most recent points
    let cIv: number | null = null;
    let cRv: number | null = null;
    for (let i = pts.length - 1; i >= 0; i--) {
      if (cIv === null && pts[i].iv !== null) cIv = pts[i].iv;
      if (cRv === null && pts[i].rv !== null) cRv = pts[i].rv;
      if (cIv !== null && cRv !== null) break;
    }

    const sp = cIv !== null && cRv !== null ? cIv - cRv : null;

    return { points: pts, currentIv: cIv, currentRv: cRv, spread: sp };
  }, [history, spotHistory]);

  // Status assessment based on spread
  const status = useMemo(() => {
    if (spread === null || currentIv === null) return { label: "—", tone: "text-neutral-400", desc: "Insufficient data for IV/RV comparison." };
    const ratio = currentIv > 0 ? spread / currentIv : 0;
    if (ratio > 0.20) return { label: "IV RICH", tone: "text-emerald-400", desc: "Implied vol is well above realized. Selling premium (writing options) is statistically attractive — but check the smile shape for context." };
    if (ratio > 0.05) return { label: "IV ELEVATED", tone: "text-emerald-300", desc: "IV trades modestly above realized. Mild edge for sellers." };
    if (ratio > -0.05) return { label: "IV FAIR", tone: "text-neutral-300", desc: "IV and realized are close. No directional edge." };
    if (ratio > -0.20) return { label: "IV CHEAP", tone: "text-amber-400", desc: "IV is below realized. Buying premium may be attractive if the realized regime persists." };
    return { label: "IV DISCOUNT", tone: "text-red-400", desc: "Implied vol is materially below realized. Either the market expects calm or the realized window has captured an event spike." };
  }, [spread, currentIv]);

  if (history.length === 0 || spotHistory.length < 6) {
    return (
      <section className="rounded border border-neutral-800 bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-300">IV vs REALIZED VOL</span>
          <span className="font-mono text-xs text-neutral-200">building history…</span>
        </div>
        <div className="p-8 text-center font-mono text-xs text-neutral-300">
          Accumulating spot data for realized vol calculation.
          <p className="mt-1 text-neutral-500">Needs at least 6 spot ticks and a few history frames.</p>
        </div>
      </section>
    );
  }

  const chartData = points.map((p) => ({
    ts: p.ts,
    iv: p.iv !== null ? p.iv * 100 : null,
    rv: p.rv !== null ? p.rv * 100 : null,
  }));

  return (
    <section className="rounded border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-300">IV vs REALIZED VOL</span>
        <span className={`font-mono text-xs font-bold ${status.tone}`}>{status.label}</span>
      </div>

      <div className="p-4 sm:p-5">
        {/* Top stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-neutral-800 pb-4">
          <StatCell label="ATM IV" value={currentIv !== null ? `${(currentIv * 100).toFixed(1)}%` : "—"} tone="blue" />
          <StatCell label="REALIZED VOL" value={currentRv !== null ? `${(currentRv * 100).toFixed(1)}%` : "—"} tone="neutral" />
          <StatCell
            label="IV − RV SPREAD"
            value={spread !== null ? `${spread >= 0 ? "+" : ""}${(spread * 100).toFixed(1)}pp` : "—"}
            tone={spread !== null ? (spread > 0 ? "emerald" : spread < 0 ? "red" : "neutral") : "neutral"}
          />
          <StatCell label="STATUS" value={status.label} tone="neutral" />
        </div>

        {/* Chart */}
        <div className="mt-4 w-full" style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#262626" strokeDasharray="3 3" />
              <XAxis
                dataKey="ts"
                stroke="#737373"
                tick={{ fontSize: 11, fontFamily: "monospace", fill: "#a3a3a3" }}
               tickFormatter={(ts) => {
                  const d = new Date(typeof ts === "number" ? ts : Number(ts));
                  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
                }}
                minTickGap={40}
              />
              <YAxis
                stroke="#737373"
                tick={{ fontSize: 11, fontFamily: "monospace", fill: "#a3a3a3" }}
                tickFormatter={(v) => `${(typeof v === "number" ? v : Number(v)).toFixed(0)}%`}
                width={48}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  background: "#0a0a0a",
                  border: "1px solid #404040",
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
               labelFormatter={(ts) => {
                  const d = new Date(typeof ts === "number" ? ts : Number(ts));
                  return d.toLocaleTimeString();
                }}
                formatter={(v) => (typeof v === "number" ? `${v.toFixed(2)}%` : "—")}
              />
              <Legend
                wrapperStyle={{ fontFamily: "monospace", fontSize: 11, color: "#a3a3a3" }}
              />
              <Line type="monotone" dataKey="iv" stroke="#60a5fa" strokeWidth={2} dot={false} name="ATM IV (SVI)" isAnimationActive={false} connectNulls />
              <Line type="monotone" dataKey="rv" stroke="#fbbf24" strokeWidth={2} strokeDasharray="4 4" dot={false} name="10-min Realized Vol" isAnimationActive={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Interpretation */}
        <div className="mt-4 rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2.5">
          <p className="font-mono text-xs text-neutral-200 leading-relaxed">{status.desc}</p>
        </div>

        {/* Methodology */}
        <details className="mt-3 group">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-neutral-400 hover:text-neutral-200">
            ⓘ METHODOLOGY
          </summary>
          <div className="mt-2 rounded border border-neutral-800 bg-neutral-950/40 px-3 py-2.5 font-mono text-xs text-neutral-400 leading-relaxed space-y-1.5">
            <p>· ATM IV is computed from the nearest-expiry oracle's SVI parameters: σ_IV = √w(0). Sampled from history frames.</p>
            <p>· Realized vol uses log returns over a rolling 10-minute window of spot ticks, annualized via sqrt(samplesPerYear).</p>
            <p>· Spread = IV − RV. Positive spread historically signals option-writing edge (IV overprices realized risk).</p>
            <p>· Both series are unfiltered — short-term spikes in RV may reflect microstructure noise, not regime shifts.</p>
          </div>
        </details>
      </div>
    </section>
  );
}

function StatCell({ label, value, tone }: { label: string; value: string; tone: "blue" | "emerald" | "red" | "neutral" }) {
  const valueClass =
    tone === "blue" ? "text-blue-400" :
    tone === "emerald" ? "text-emerald-400" :
    tone === "red" ? "text-red-400" :
    "text-white";
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 font-bold">{label}</p>
      <p className={`mt-1 font-mono text-base sm:text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}