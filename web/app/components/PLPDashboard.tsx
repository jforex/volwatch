"use client";

import { VaultSnapshot } from "../lib/useVolStream";
import { formatUSD } from "../lib/format";

export function PLPDashboard({ vault }: { vault: VaultSnapshot | null }) {
  if (!vault) {
    return (
      <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-6 text-center text-sm text-neutral-600">
        Loading vault state…
      </div>
    );
  }

  // Color for utilization gauge: green low, amber mid, red high.
  // Relative to the protocol's ceiling.
  const utilRatio = vault.exposureCeilingPct > 0
    ? vault.utilizationPct / vault.exposureCeilingPct
    : 0;
  const utilColor =
    utilRatio < 0.4 ? "bg-emerald-500" : utilRatio < 0.75 ? "bg-amber-500" : "bg-red-500";
  const utilTextColor =
    utilRatio < 0.4 ? "text-emerald-400" : utilRatio < 0.75 ? "text-amber-400" : "text-red-400";

  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-5">
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            PLP vault · risk
          </h2>
          <p className="mt-1 text-[10px] text-neutral-600">
            On-chain · refreshed every 10s
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {vault.tradingPaused ? (
            <span className="rounded border border-red-900/60 bg-red-950 px-2 py-0.5 text-red-400">
              PAUSED
            </span>
          ) : (
            <span className="rounded border border-emerald-900/60 bg-emerald-950 px-2 py-0.5 text-emerald-400">
              TRADING LIVE
            </span>
          )}
        </div>
      </div>

      {/* Top stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric
          label="Vault balance"
          value={formatUSD(vault.vaultBalance)}
          accent="text-neutral-100"
        />
        <Metric
          label="PLP supply"
          value={vault.plpSupply.toLocaleString("en-US", {
            maximumFractionDigits: 0,
          })}
        />
        <Metric
          label="NAV / share"
          value={`$${vault.pricePerShare.toFixed(4)}`}
          accent={
            vault.pricePerShare >= 1
              ? "text-emerald-400"
              : "text-red-400"
          }
          sub={`${((vault.pricePerShare - 1) * 100).toFixed(2)}% vs $1`}
        />
        <Metric
          label="Max payout liability"
          value={formatUSD(vault.totalMaxPayout)}
          sub={`MTM ${formatUSD(vault.totalMTM)}`}
        />
      </div>

      {/* Utilization gauge */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-neutral-500">
            Vault utilization
          </span>
          <span className={`font-mono ${utilTextColor}`}>
            {vault.utilizationPct.toFixed(3)}% / {vault.exposureCeilingPct.toFixed(0)}% cap
          </span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-neutral-900">
          <div
            className={`h-full ${utilColor} transition-all`}
            style={{
              width: `${Math.min(100, (utilRatio) * 100)}%`,
            }}
          />
        </div>
        <p className="mt-2 text-[10px] text-neutral-600">
          Headroom:{" "}
          <span className="font-mono text-neutral-400">
            {vault.headroomPct.toFixed(2)}%
          </span>
          {" · "}max exposure cap defined by protocol risk config.
        </p>
      </div>

      {/* Bottom row: matrices, settled, limiter */}
      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-neutral-900 pt-4 text-xs">
        <SubStat
          label="Active strike matrices"
          value={String(vault.activeStrikeMatrices)}
          hint="oracles currently writing positions"
        />
        <SubStat
          label="Settled history"
          value={vault.settledOraclesCount.toLocaleString("en-US")}
          hint="oracles that have settled to date"
        />
        <SubStat
          label="Withdrawal limiter"
          value={vault.withdrawalLimiter.enabled ? "enabled" : "off"}
          hint={
            vault.withdrawalLimiter.enabled
              ? `${formatUSD(vault.withdrawalLimiter.available)} / ${formatUSD(vault.withdrawalLimiter.capacity)}`
              : "unrestricted withdrawals"
          }
          accent={vault.withdrawalLimiter.enabled ? "text-amber-400" : "text-neutral-300"}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  accent = "text-neutral-200",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-600">
        {label}
      </p>
      <p className={`mt-1 font-mono text-lg font-semibold ${accent}`}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-neutral-600">{sub}</p>}
    </div>
  );
}

function SubStat({
  label,
  value,
  hint,
  accent = "text-neutral-300",
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-600">
        {label}
      </p>
      <p className={`mt-1 font-mono text-sm ${accent}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-neutral-600">{hint}</p>}
    </div>
  );
}
