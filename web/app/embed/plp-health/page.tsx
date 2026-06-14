"use client";

import { useVolStreamContext } from "../../lib/VolStreamContext";
import { formatUSD } from "../../lib/format";

export default function PLPHealthEmbed() {
  const { vault, status } = useVolStreamContext();

  if (!vault) {
    return (
      <main className="min-h-screen bg-neutral-950 p-2">
        <div className="rounded border border-neutral-800 bg-neutral-900 p-8 text-center font-mono text-xs text-neutral-400">
          Loading PLP vault state…
        </div>
      </main>
    );
  }

  // Risk score — same formula as the main PLP page
  const utilRatio = vault.exposureCeilingPct > 0
    ? Math.min(1, vault.utilizationPct / vault.exposureCeilingPct)
    : 0;
  const payoutRatio = vault.vaultBalance > 0
    ? Math.min(1, vault.totalMaxPayout / vault.vaultBalance)
    : 0;
  const withdrawalPressure = vault.withdrawalLimiter.enabled && vault.withdrawalLimiter.capacity > 0
    ? 1 - (vault.withdrawalLimiter.available / vault.withdrawalLimiter.capacity)
    : 0;
  const riskScore = Math.round(Math.max(0, Math.min(100, (utilRatio * 0.5 + payoutRatio * 0.35 + withdrawalPressure * 0.15) * 100)));

  const healthLabel = vault.tradingPaused ? "PAUSED" : riskScore >= 80 ? "CRITICAL" : riskScore >= 60 ? "ELEVATED" : "HEALTHY";
  const healthTone =
    vault.tradingPaused ? "text-neutral-400" :
    riskScore >= 80 ? "text-red-400" :
    riskScore >= 60 ? "text-amber-400" :
    "text-emerald-400";
  const healthDot =
    vault.tradingPaused ? "bg-neutral-500" :
    riskScore >= 80 ? "bg-red-500 animate-pulse" :
    riskScore >= 60 ? "bg-amber-500" :
    "bg-emerald-500 animate-pulse";

  const navDelta = (vault.pricePerShare - 1) * 100;

  return (
    <main className="min-h-screen bg-neutral-950 p-2">
      <div className="rounded border border-neutral-800 bg-neutral-900">
        <div className="border-b border-neutral-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-300 font-bold">PLP HEALTH</span>
            <span className="text-neutral-700">·</span>
            <span className={`font-mono text-xs font-bold ${status === "open" ? "text-emerald-400" : "text-amber-400"}`}>
              {status === "open" ? "● LIVE" : status === "connecting" ? "○ CONNECTING" : "○ OFFLINE"}
            </span>
          </div>
        <a  
            href="https://volwatch.vercel.app"
            target="_blank"
            rel="noopener"
            className="font-mono text-xs text-neutral-400 hover:text-blue-400 transition-colors"
          >
            vwatch ↗
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800">
          <Cell label="VAULT" value={formatUSD(vault.vaultBalance)} sub={`MTM ${formatUSD(vault.totalMTM)}`} />
          <Cell label="NAV / SHARE" value={`$${vault.pricePerShare.toFixed(4)}`} sub={`${navDelta >= 0 ? "+" : ""}${navDelta.toFixed(2)}%`} tone={navDelta >= 0 ? "emerald" : "red"} />
          <Cell label="UTILIZATION" value={`${vault.utilizationPct.toFixed(1)}%`} sub={`cap ${vault.exposureCeilingPct.toFixed(0)}%`} tone={utilRatio > 0.9 ? "red" : utilRatio > 0.75 ? "amber" : "emerald"} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800 border-t border-neutral-800">
          <Cell label="MAX PAYOUT" value={formatUSD(vault.totalMaxPayout)} sub={`${(payoutRatio * 100).toFixed(0)}% of vault`} />
          <Cell label="RISK SCORE" value={`${riskScore}`} sub="composite · synthetic" tone={riskScore >= 80 ? "red" : riskScore >= 60 ? "amber" : "emerald"} />
          <Cell
            label="STATUS"
            value={
              <span className={`flex items-center gap-1.5 ${healthTone}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${healthDot}`} />
                {healthLabel}
              </span>
            }
            sub={vault.tradingPaused ? "paused" : "trading live"}
          />
        </div>
      </div>
    </main>
  );
}

function Cell({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "emerald" | "amber" | "red" }) {
  const valueTone =
    tone === "red" ? "text-red-400" :
    tone === "amber" ? "text-amber-400" :
    tone === "emerald" ? "text-emerald-400" :
    "text-white";
  return (
    <div className="px-4 py-3">
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 font-bold">{label}</p>
      <p className={`mt-1 font-mono text-base font-bold ${valueTone} truncate`}>{value}</p>
      {sub && <p className="mt-0.5 font-mono text-xs text-neutral-500 truncate">{sub}</p>}
    </div>
  );
}