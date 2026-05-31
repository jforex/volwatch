"use client";

import { VaultSnapshot } from "../lib/useVolStream";
import { formatUSD } from "../lib/format";

export function PLPDashboard({ vault }: { vault: VaultSnapshot | null }) {
  if (!vault) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 shadow-sm">
        Loading vault state…
      </div>
    );
  }

  const utilRatio = vault.exposureCeilingPct > 0 ? vault.utilizationPct / vault.exposureCeilingPct : 0;
  const utilColor = utilRatio < 0.4 ? "bg-emerald-500" : utilRatio < 0.75 ? "bg-amber-500" : "bg-red-500";
  const utilTextColor = utilRatio < 0.4 ? "text-emerald-700" : utilRatio < 0.75 ? "text-amber-700" : "text-red-700";

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">PLP vault · risk</h2>
          <p className="mt-1 text-xs text-neutral-500">On-chain · refreshed every 10s</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {vault.tradingPaused ? (
            <span className="rounded border border-red-300 bg-red-50 px-3 py-1 text-red-700 font-bold">PAUSED</span>
          ) : (
            <span className="rounded border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700 font-bold">TRADING LIVE</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <Metric label="Vault balance" value={formatUSD(vault.vaultBalance)} accent="text-neutral-900" />
        <Metric label="PLP supply" value={vault.plpSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
        <Metric
          label="NAV / share"
          value={`$${vault.pricePerShare.toFixed(4)}`}
          accent={vault.pricePerShare >= 1 ? "text-emerald-700" : "text-red-700"}
          sub={`${((vault.pricePerShare - 1) * 100).toFixed(2)}% vs $1`}
        />
        <Metric label="Max payout liability" value={formatUSD(vault.totalMaxPayout)} sub={`MTM ${formatUSD(vault.totalMTM)}`} />
      </div>

      <div className="mt-7">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-bold uppercase tracking-wider text-neutral-700">Vault utilization</span>
          <span className={`font-mono font-bold ${utilTextColor}`}>
            {vault.utilizationPct.toFixed(3)}% / {vault.exposureCeilingPct.toFixed(0)}% cap
          </span>
        </div>
        <div className="mt-2 h-3.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className={`h-full ${utilColor} transition-all`} style={{ width: `${Math.min(100, utilRatio * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Headroom: <span className="font-mono font-bold text-neutral-700">{vault.headroomPct.toFixed(2)}%</span> · max exposure cap defined by protocol risk config.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-5 border-t border-neutral-200 pt-5 text-sm">
        <SubStat label="Active strike matrices" value={String(vault.activeStrikeMatrices)} hint="oracles currently writing positions" />
        <SubStat label="Settled history" value={vault.settledOraclesCount.toLocaleString("en-US")} hint="oracles that have settled to date" />
        <SubStat
          label="Withdrawal limiter"
          value={vault.withdrawalLimiter.enabled ? "enabled" : "off"}
          hint={vault.withdrawalLimiter.enabled ? `${formatUSD(vault.withdrawalLimiter.available)} / ${formatUSD(vault.withdrawalLimiter.capacity)}` : "unrestricted withdrawals"}
          accent={vault.withdrawalLimiter.enabled ? "text-amber-700" : "text-neutral-700"}
        />
      </div>
    </div>
  );
}

function Metric({ label, value, sub, accent = "text-neutral-900" }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">{label}</p>
      <p className={`mt-1 font-mono text-xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

function SubStat({ label, value, hint, accent = "text-neutral-900" }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">{label}</p>
      <p className={`mt-1 font-mono text-base font-bold ${accent}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
