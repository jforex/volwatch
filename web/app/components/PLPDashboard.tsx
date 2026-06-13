"use client";

import { VaultSnapshot } from "../lib/useVolStream";
import { formatUSD } from "../lib/format";

export function PLPDashboard({ vault }: { vault: VaultSnapshot | null }) {
  if (!vault) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8 text-center text-sm text-neutral-300 shadow-sm">
        Loading vault state…
      </div>
    );
  }

  const utilRatio = vault.exposureCeilingPct > 0 ? vault.utilizationPct / vault.exposureCeilingPct : 0;
  const utilColor = utilRatio < 0.4 ? "bg-emerald-500" : utilRatio < 0.75 ? "bg-amber-500" : "bg-red-500";
  const utilTextColor = utilRatio < 0.4 ? "text-emerald-700" : utilRatio < 0.75 ? "text-amber-700" : "text-red-700";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="mb-4 sm:mb-5 flex items-start sm:items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">PLP vault · risk</h2>
          <p className="mt-1 text-xs text-neutral-300">On-chain · refreshed every 10s</p>
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm shrink-0">
          {vault.tradingPaused ? (
            <span className="rounded border border-red-300 bg-red-50 px-2 py-1 sm:px-3 text-red-700 font-bold">PAUSED</span>
          ) : (
            <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 sm:px-3 text-emerald-700 font-bold">TRADING LIVE</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-5 sm:grid-cols-4">
        <Metric label="Vault balance" value={formatUSD(vault.vaultBalance)} accent="text-neutral-900" />
        <Metric label="PLP supply" value={vault.plpSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
        <Metric
          label="NAV / share"
          value={`$${vault.pricePerShare.toFixed(4)}`}
          accent={vault.pricePerShare >= 1 ? "text-emerald-700" : "text-red-700"}
          sub={`${((vault.pricePerShare - 1) * 100).toFixed(2)}% vs $1`}
        />
        <Metric label="Max payout" value={formatUSD(vault.totalMaxPayout)} sub={`MTM ${formatUSD(vault.totalMTM)}`} />
      </div>

      <div className="mt-6 sm:mt-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="font-bold uppercase tracking-wider text-neutral-700">Vault utilization</span>
          <span className={`font-mono font-bold ${utilTextColor}`}>
            {vault.utilizationPct.toFixed(3)}% / {vault.exposureCeilingPct.toFixed(0)}% cap
          </span>
        </div>
        <div className="mt-2 h-3 sm:h-3.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className={`h-full ${utilColor} transition-all`} style={{ width: `${Math.min(100, utilRatio * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-neutral-300">
          Headroom: <span className="font-mono font-bold text-neutral-700">{vault.headroomPct.toFixed(2)}%</span>
        </p>
      </div>

      <div className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 border-t border-neutral-200 pt-4 sm:pt-5 text-sm">
        <SubStat label="Active matrices" value={String(vault.activeStrikeMatrices)} hint="oracles writing positions" />
        <SubStat label="Settled history" value={vault.settledOraclesCount.toLocaleString("en-US")} hint="oracles settled to date" />
        <SubStat
          label="Withdrawal limiter"
          value={vault.withdrawalLimiter.enabled ? "enabled" : "off"}
          hint={vault.withdrawalLimiter.enabled ? `${formatUSD(vault.withdrawalLimiter.available)} / ${formatUSD(vault.withdrawalLimiter.capacity)}` : "unrestricted"}
          accent={vault.withdrawalLimiter.enabled ? "text-amber-700" : "text-neutral-700"}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, sub, accent = "text-neutral-900" }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wider text-neutral-300 font-semibold truncate">{label}</p>
      <p className={`mt-1 font-mono text-base sm:text-xl font-bold truncate ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-300 truncate">{sub}</p>}
    </div>
  );
}

function SubStat({ label, value, hint, accent = "text-neutral-900" }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-neutral-300 font-semibold">{label}</p>
      <p className={`mt-1 font-mono text-base font-bold ${accent}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-neutral-300">{hint}</p>}
    </div>
  );
}
