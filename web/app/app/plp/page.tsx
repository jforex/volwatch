"use client";

import { useEffect, useState } from "react";
import { useVolStreamContext } from "../../lib/VolStreamContext";
import { TimeTravel } from "../../components/TimeTravel";
import { formatUSD, formatTime } from "../../lib/format";

export default function PLPPage() {
const { vault, oracles, scrubTs, setScrubTs, scrubRange, isScrubbing, goLive, status, recent } = useVolStreamContext();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const lastTickTs = recent.length > 0 ? recent[0].ts : null;

  // Derive Risk Score (0-100, higher = riskier)
  const riskScore = vault ? computeRiskScore(vault) : null;
  const healthStatus = riskScore !== null ? classifyHealth(riskScore, vault) : null;

  return (
    <main className="px-3 sm:px-5 py-3 sm:py-4">
      <div className="mx-auto max-w-[1600px]">
        {/* Status strip */}
        <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto whitespace-nowrap border border-neutral-800 bg-neutral-900/60 rounded px-3 sm:px-4 py-2 font-mono text-[11px] sm:text-xs">
          <span className="text-blue-400 font-bold">/ PLP</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">DeepBook Predict</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">Sui Testnet</span>
          <span className="text-neutral-600">·</span>
          <span className={status === "open" ? "text-emerald-400" : "text-amber-400"}>
            {status === "open" ? "● LIVE" : status === "connecting" ? "○ CONNECTING" : "○ OFFLINE"}
          </span>
          {isScrubbing && (
            <>
              <span className="text-neutral-600">·</span>
              <span className="text-amber-400 font-bold">⏪ REPLAY</span>
            </>
          )}
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            LAST <span className="text-white">{lastTickTs ? formatTime(lastTickTs) : "—"}</span>
          </span>
          {vault && (
            <>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-400">
                VAULT <span className="text-white">{formatUSD(vault.vaultBalance)}</span>
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-400">
                NAV <span className="text-white">${vault.pricePerShare.toFixed(4)}</span>
              </span>
              {healthStatus && (
                <>
                  <span className="text-neutral-600">·</span>
                  <span className={`font-bold ${healthStatus.tone}`}>
                    {healthStatus.icon} {healthStatus.label.toUpperCase()}
                  </span>
                </>
              )}
            </>
          )}
        </div>

        {/* Time travel */}
        <div className="mt-3">
          <TimeTravel
            scrubTs={scrubTs}
            setScrubTs={setScrubTs}
            scrubRange={scrubRange}
            isScrubbing={isScrubbing}
            goLive={goLive}
          />
        </div>

        {!vault ? (
          <div className="mt-3 rounded border border-neutral-800 bg-neutral-900 p-8 text-center font-mono text-xs text-neutral-500">
            Loading vault state…
          </div>
        ) : (
          <>
            {/* PANEL 1 — Health Summary */}
            <HealthSummary vault={vault} riskScore={riskScore!} healthStatus={healthStatus!} />

            {/* PLACEHOLDERS for remaining panels — will fill in next steps */}
            <div className="mt-3 grid grid-cols-12 gap-3">
              <VaultUtilization vault={vault} />
              <WithdrawalLimiter vault={vault} />
            </div>

            <div className="mt-3 grid grid-cols-12 gap-3">
              <MaxPayouts vault={vault} />
              <OracleHealth oracles={oracles} recent={recent} now={now} />
            </div>

            <PlaceholderSection label="SCENARIO SIMULATOR" sub="±2% / ±5% / ±10% BTC moves → vault impact" colSpan="col-span-12" wrap />
          </>
        )}
      </div>
    </main>
  );
}

// ---------- Derived metrics ----------

function computeRiskScore(vault: NonNullable<ReturnType<typeof useVolStreamContext>["vault"]>): number {
  // 0-100, higher = more risk.
  // Inputs we have: utilizationPct, exposureCeilingPct, totalMaxPayout vs vaultBalance, withdrawalLimiter availability.
  // Synthetic derivation — honest, but it's a heuristic.

  // 1. Utilization ratio (0..1 against ceiling)
  const utilRatio = vault.exposureCeilingPct > 0
    ? Math.min(1, vault.utilizationPct / vault.exposureCeilingPct)
    : 0;

  // 2. Payout coverage — what % of vault is at risk if all positions max out
  const payoutRatio = vault.vaultBalance > 0
    ? Math.min(1, vault.totalMaxPayout / vault.vaultBalance)
    : 0;

  // 3. Withdrawal pressure — if limiter enabled and capacity is low, risk is higher
  const withdrawalPressure = vault.withdrawalLimiter.enabled && vault.withdrawalLimiter.capacity > 0
    ? 1 - (vault.withdrawalLimiter.available / vault.withdrawalLimiter.capacity)
    : 0;

  // Weighted average: utilization is the biggest driver
  const score = (utilRatio * 0.5 + payoutRatio * 0.35 + withdrawalPressure * 0.15) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function classifyHealth(riskScore: number, vault: NonNullable<ReturnType<typeof useVolStreamContext>["vault"]> | null) {
  if (vault?.tradingPaused) {
    return { label: "Paused", icon: "⏸", tone: "text-neutral-400" };
  }
  if (riskScore >= 80) {
    return { label: "Critical", icon: "●", tone: "text-red-400" };
  }
  if (riskScore >= 60) {
    return { label: "Elevated", icon: "●", tone: "text-amber-400" };
  }
  return { label: "Healthy", icon: "●", tone: "text-emerald-400" };
}

// ---------- Panel 1: Health Summary ----------

function HealthSummary({
  vault,
  riskScore,
  healthStatus,
}: {
  vault: NonNullable<ReturnType<typeof useVolStreamContext>["vault"]>;
  riskScore: number;
  healthStatus: { label: string; icon: string; tone: string };
}) {
  const navDeltaFromOne = (vault.pricePerShare - 1) * 100;

  return (
    <section className="mt-3 rounded border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">PLP HEALTH SUMMARY</span>
        <span className="font-mono text-[10px] text-neutral-600">on-chain vault state · live</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-neutral-800">
        <SummaryCell
          label="VAULT BALANCE"
          value={formatUSD(vault.vaultBalance)}
          sub={`MTM ${formatUSD(vault.totalMTM)}`}
        />
        <SummaryCell
          label="PLP SUPPLY"
          value={`${(vault.plpSupply / 1e6).toFixed(2)}M`}
          sub={`${vault.plpSupply.toLocaleString("en-US", { maximumFractionDigits: 0 })} PLP`}
        />
        <SummaryCell
          label="NAV / SHARE"
          value={`$${vault.pricePerShare.toFixed(4)}`}
          sub={`${navDeltaFromOne >= 0 ? "+" : ""}${navDeltaFromOne.toFixed(2)}% vs $1`}
          tone={navDeltaFromOne >= 0 ? "emerald" : "red"}
        />
        <SummaryCell
          label="UTILIZATION"
          value={`${vault.utilizationPct.toFixed(1)}%`}
          sub={`cap ${vault.exposureCeilingPct.toFixed(0)}%`}
          tone={
            vault.utilizationPct / vault.exposureCeilingPct > 0.9 ? "red"
            : vault.utilizationPct / vault.exposureCeilingPct > 0.75 ? "amber"
            : "emerald"
          }
        />
        <SummaryCell
          label="RISK SCORE"
          value={`${riskScore} / 100`}
          sub="composite · synthetic"
          tone={riskScore >= 80 ? "red" : riskScore >= 60 ? "amber" : "emerald"}
        />
        <SummaryCell
          label="HEALTH STATUS"
          value={
            <span className={`flex items-center gap-1.5 ${healthStatus.tone}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                healthStatus.tone.includes("emerald") ? "bg-emerald-400 animate-pulse" :
                healthStatus.tone.includes("amber") ? "bg-amber-400" :
                healthStatus.tone.includes("red") ? "bg-red-400 animate-pulse" :
                "bg-neutral-400"
              }`} />
              {healthStatus.label.toUpperCase()}
            </span>
          }
          sub={vault.tradingPaused ? "trading paused" : "trading live"}
        />
      </div>
    </section>
  );
}

function SummaryCell({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: "emerald" | "amber" | "red";
}) {
  const valueTone =
    tone === "red" ? "text-red-400" :
    tone === "amber" ? "text-amber-400" :
    tone === "emerald" ? "text-emerald-400" :
    "text-white";

  return (
    <div className="px-3 sm:px-4 py-3 sm:py-4">
      <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{label}</p>
      <p className={`mt-1 sm:mt-1.5 font-mono text-base sm:text-lg font-bold ${valueTone} truncate`}>{value}</p>
      {sub && <p className="mt-0.5 font-mono text-[10px] text-neutral-600 truncate">{sub}</p>}
    </div>
  );
}

// ---------- Panel 2: Vault Utilization ----------

function VaultUtilization({
  vault,
}: {
  vault: NonNullable<ReturnType<typeof useVolStreamContext>["vault"]>;
}) {
  const util = vault.utilizationPct;
  const cap = vault.exposureCeilingPct;
  const ratio = cap > 0 ? util / cap : 0;
  const fillPct = Math.min(100, ratio * 100);

  // Thresholds (% of cap):
  // < 40 idle, 40-75 healthy, 75-90 aggressive, > 90 stressed
  const zone =
    ratio < 0.4 ? { label: "IDLE", color: "text-neutral-400", bar: "bg-neutral-500", desc: "Capital is under-deployed. Lower yields, low risk." } :
    ratio < 0.75 ? { label: "HEALTHY", color: "text-emerald-400", bar: "bg-emerald-500", desc: "Productive deployment. Yield and risk balanced." } :
    ratio < 0.9 ? { label: "AGGRESSIVE", color: "text-amber-400", bar: "bg-amber-500", desc: "Vault is leaning into risk. Strong yield but watch the ceiling." } :
    { label: "STRESSED", color: "text-red-400", bar: "bg-red-500", desc: "Near ceiling. New positions may be restricted." };

  return (
    <section className="col-span-12 lg:col-span-6 rounded border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">VAULT UTILIZATION</span>
        <span className={`font-mono text-[10px] font-bold ${zone.color}`}>{zone.label}</span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-mono text-3xl sm:text-4xl font-bold text-white">
            {util.toFixed(2)}<span className="text-lg sm:text-xl text-neutral-500">%</span>
          </p>
          <p className="font-mono text-xs text-neutral-500">
            of <span className="text-neutral-300">{cap.toFixed(0)}%</span> cap
          </p>
        </div>

        {/* Progress bar with zone markers */}
        <div className="mt-4 relative">
          <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800">
            <div
              className={`h-full ${zone.bar} transition-all duration-500`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          {/* Zone divider markers at 40% and 75% and 90% of the cap */}
          <div className="absolute inset-0 flex pointer-events-none">
            <div style={{ width: "40%" }} className="border-r border-neutral-700/50" />
            <div style={{ width: "35%" }} className="border-r border-neutral-700/50" />
            <div style={{ width: "15%" }} className="border-r border-neutral-700/50" />
            <div className="flex-1" />
          </div>
        </div>

        {/* Threshold legend */}
        <div className="mt-2 grid grid-cols-4 gap-1 font-mono text-[9px] text-neutral-500">
          <div>0–40% <span className="text-neutral-600">idle</span></div>
          <div>40–75% <span className="text-neutral-600">healthy</span></div>
          <div>75–90% <span className="text-neutral-600">aggressive</span></div>
          <div>90–100% <span className="text-neutral-600">stressed</span></div>
        </div>

        {/* Interpretation */}
        <div className="mt-5 rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2.5">
          <p className="font-mono text-[10px] text-neutral-400 leading-relaxed">{zone.desc}</p>
        </div>

        {/* Sub-stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-neutral-800 pt-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold">HEADROOM</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-white">{vault.headroomPct.toFixed(2)}%</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold">ACTIVE MATRICES</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-white">{vault.activeStrikeMatrices}</p>
          </div>
        </div>
      </div>
    </section>
  );
}


// ---------- Panel 3: Withdrawal Limiter ----------

function WithdrawalLimiter({
  vault,
}: {
  vault: NonNullable<ReturnType<typeof useVolStreamContext>["vault"]>;
}) {
  const limiter = vault.withdrawalLimiter;

  if (!limiter.enabled) {
    return (
      <section className="col-span-12 lg:col-span-6 rounded border border-neutral-800 bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">WITHDRAWAL LIMITER</span>
          <span className="font-mono text-[10px] font-bold text-neutral-400">UNRESTRICTED</span>
        </div>
        <div className="p-6 sm:p-8 text-center">
          <p className="font-mono text-2xl sm:text-3xl font-bold text-white">∞</p>
          <p className="mt-2 font-mono text-xs text-neutral-500">Limiter is disabled. LPs may withdraw freely.</p>
        </div>
      </section>
    );
  }

  const availability = limiter.capacity > 0 ? limiter.available / limiter.capacity : 0;
  const fillPct = Math.min(100, availability * 100);

  const status =
    availability >= 0.5 ? { label: "HEALTHY", color: "text-emerald-400", bar: "bg-emerald-500", desc: "Plenty of withdrawal capacity. LPs unlikely to be queued." } :
    availability >= 0.2 ? { label: "CONSTRAINED", color: "text-amber-400", bar: "bg-amber-500", desc: "Capacity is being consumed. Large withdrawals may face delays." } :
    { label: "CRITICAL", color: "text-red-400", bar: "bg-red-500", desc: "Bucket nearly empty. New withdrawal requests will queue until refill." };

  return (
    <section className="col-span-12 lg:col-span-6 rounded border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">WITHDRAWAL LIMITER</span>
        <span className={`font-mono text-[10px] font-bold ${status.color}`}>{status.label}</span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold">AVAILABLE NOW</p>
            <p className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-white">{formatUSD(limiter.available)}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold">CAPACITY</p>
            <p className="mt-1 font-mono text-sm sm:text-base font-bold text-neutral-300">{formatUSD(limiter.capacity)}</p>
          </div>
        </div>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className={`h-full ${status.bar} transition-all duration-500`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <p className="mt-1.5 font-mono text-[10px] text-neutral-500">
          {availability >= 1 ? "Bucket full" : `${(availability * 100).toFixed(1)}% available`}
        </p>

        <div className="mt-5 rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2.5">
          <p className="font-mono text-[10px] text-neutral-400 leading-relaxed">{status.desc}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-neutral-800 pt-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold">CONSUMED</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-white">{formatUSD(limiter.capacity - limiter.available)}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold">FILL %</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-white">{(availability * 100).toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </section>
  );
}



// ---------- Panel 4: Max Payouts ----------

function MaxPayouts({
  vault,
}: {
  vault: NonNullable<ReturnType<typeof useVolStreamContext>["vault"]>;
}) {
  const maxPayout = vault.totalMaxPayout;
  const vaultSize = vault.vaultBalance;
  const payoutRatio = vaultSize > 0 ? (maxPayout / vaultSize) * 100 : 0;

  const status =
    payoutRatio < 25 ? { label: "WELL COVERED", color: "text-emerald-400", bar: "bg-emerald-500", desc: "Worst-case payouts are a fraction of vault assets. PLP is over-collateralized." } :
    payoutRatio < 50 ? { label: "ADEQUATE", color: "text-emerald-400", bar: "bg-emerald-500", desc: "Vault holds enough to cover all open obligations comfortably." } :
    payoutRatio < 75 ? { label: "ELEVATED", color: "text-amber-400", bar: "bg-amber-500", desc: "Open payout obligations are a significant share of vault. Worth watching." } :
    payoutRatio < 100 ? { label: "STRESSED", color: "text-amber-400", bar: "bg-amber-500", desc: "Payouts approaching vault size. Limited buffer for adverse moves." } :
    { label: "OVER-EXPOSED", color: "text-red-400", bar: "bg-red-500", desc: "Max potential payouts exceed vault assets. Insolvency risk if worst case materializes." };

  const fillPct = Math.min(100, payoutRatio);

  return (
    <section className="col-span-12 lg:col-span-6 rounded border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">MAX PAYOUTS</span>
        <span className={`font-mono text-[10px] font-bold ${status.color}`}>{status.label}</span>
      </div>

      <div className="p-4 sm:p-5">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold">CURRENT MAX PAYOUT</p>
          <p className="mt-1 font-mono text-2xl sm:text-3xl font-bold text-white">{formatUSD(maxPayout)}</p>
          <p className="mt-1 font-mono text-[10px] text-neutral-500">
            sum of all open writing position payouts if all settle in-the-money
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold">VAULT SIZE</p>
            <p className="mt-1 font-mono text-lg font-bold text-white">{formatUSD(vaultSize)}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold">PAYOUT RATIO</p>
            <p className={`mt-1 font-mono text-lg font-bold ${status.color}`}>{payoutRatio.toFixed(1)}%</p>
          </div>
        </div>

        {/* Visual bar — how much of vault is "at risk" */}
        <div className="mt-4">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold">PAYOUT VS VAULT</span>
            <span className="font-mono text-[10px] text-neutral-500">100% = fully exposed</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-800 relative">
            <div
              className={`h-full ${status.bar} transition-all duration-500`}
              style={{ width: `${fillPct}%` }}
            />
            {/* 100% marker */}
            {payoutRatio < 100 && (
              <div className="absolute top-0 bottom-0 right-0 w-px bg-neutral-600" />
            )}
          </div>
        </div>

        {/* Interpretation */}
        <div className="mt-5 rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2.5">
          <p className="font-mono text-[10px] text-neutral-400 leading-relaxed">{status.desc}</p>
        </div>
      </div>
    </section>
  );
}


// ---------- Panel 5: Oracle Health ----------

function OracleHealth({
  oracles,
  recent,
  now,
}: {
  oracles: ReturnType<typeof useVolStreamContext>["oracles"];
  recent: ReturnType<typeof useVolStreamContext>["recent"];
  now: number;
}) {
  // Build a map: oracleId → most recent event timestamp (from recent buffer)
  const lastSeen = new Map<string, number>();
  for (const ev of recent) {
    const existing = lastSeen.get(ev.oracleId);
    if (!existing || ev.ts > existing) {
      lastSeen.set(ev.oracleId, ev.ts);
    }
  }

  // List active oracles with their freshness
  const oracleRows = Object.values(oracles)
    .filter((o) => o.expiryMs && o.expiryMs > now)
    .map((o) => {
      const seenAt = lastSeen.get(o.oracleId);
      const ageSeconds = seenAt ? (now - seenAt) / 1000 : null;
      const minutesToExpiry = Math.round((o.expiryMs! - now) / 60000);
      return { oracleId: o.oracleId, ageSeconds, minutesToExpiry, hasSvi: !!o.svi };
    })
    .sort((a, b) => a.minutesToExpiry - b.minutesToExpiry)
    .slice(0, 8);

  // Aggregate stats
  const totalActive = oracleRows.length;
  const stale = oracleRows.filter((r) => r.ageSeconds !== null && r.ageSeconds > 60).length;
  const veryStale = oracleRows.filter((r) => r.ageSeconds !== null && r.ageSeconds > 300).length;
  const noData = oracleRows.filter((r) => r.ageSeconds === null).length;

  const overallStatus =
    veryStale > 0 || noData > Math.ceil(totalActive / 2) ? { label: "DEGRADED", color: "text-red-400" } :
    stale > 0 ? { label: "WARNING", color: "text-amber-400" } :
    { label: "HEALTHY", color: "text-emerald-400" };

  return (
    <section className="col-span-12 lg:col-span-6 rounded border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">ORACLE HEALTH</span>
        <span className={`font-mono text-[10px] font-bold ${overallStatus.color}`}>{overallStatus.label}</span>
      </div>

      <div className="p-4 sm:p-5">
        {/* Aggregate stats */}
        <div className="grid grid-cols-4 gap-3 border-b border-neutral-800 pb-4">
          <AggStat label="ACTIVE" value={String(totalActive)} tone="white" />
          <AggStat label="FRESH" value={String(totalActive - stale - noData)} tone="emerald" />
          <AggStat label="STALE" value={String(stale)} tone={stale > 0 ? "amber" : "neutral"} />
          <AggStat label="NO DATA" value={String(noData)} tone={noData > 0 ? "red" : "neutral"} />
        </div>

        {/* Per-oracle list */}
        <div className="mt-4 max-h-[280px] overflow-y-auto">
          {oracleRows.length === 0 ? (
            <p className="font-mono text-xs text-neutral-500 text-center py-6">No active oracles.</p>
          ) : (
            <ul className="divide-y divide-neutral-800/60 font-mono text-xs">
              {oracleRows.map((o) => (
                <OracleRow key={o.oracleId} {...o} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function AggStat({ label, value, tone }: { label: string; value: string; tone: "white" | "emerald" | "amber" | "red" | "neutral" }) {
  const valueClass =
    tone === "emerald" ? "text-emerald-400" :
    tone === "amber" ? "text-amber-400" :
    tone === "red" ? "text-red-400" :
    tone === "neutral" ? "text-neutral-500" :
    "text-white";
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-bold">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function OracleRow({
  oracleId,
  ageSeconds,
  minutesToExpiry,
  hasSvi,
}: {
  oracleId: string;
  ageSeconds: number | null;
  minutesToExpiry: number;
  hasSvi: boolean;
}) {
  let statusDot: string;
  let statusText: string;
  let statusTone: string;

  if (ageSeconds === null) {
    statusDot = "bg-neutral-600";
    statusText = "no data";
    statusTone = "text-neutral-500";
  } else if (ageSeconds < 15) {
    statusDot = "bg-emerald-400 animate-pulse";
    statusText = `${Math.round(ageSeconds)}s ago`;
    statusTone = "text-emerald-400";
  } else if (ageSeconds < 60) {
    statusDot = "bg-emerald-400";
    statusText = `${Math.round(ageSeconds)}s ago`;
    statusTone = "text-emerald-400";
  } else if (ageSeconds < 300) {
    statusDot = "bg-amber-400";
    statusText = `${Math.round(ageSeconds / 60)}m ago`;
    statusTone = "text-amber-400";
  } else {
    statusDot = "bg-red-400";
    statusText = `${Math.round(ageSeconds / 60)}m ago`;
    statusTone = "text-red-400";
  }

  const expiryLabel = minutesToExpiry < 60 ? `${minutesToExpiry}m` : `${(minutesToExpiry / 60).toFixed(1)}h`;

  return (
    <li className="flex items-center gap-3 px-1 py-2">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot}`} />
      <span className="text-neutral-300 shrink-0">{oracleId.slice(0, 8)}…{oracleId.slice(-4)}</span>
      <span className="text-[10px] text-neutral-500 shrink-0">exp {expiryLabel}</span>
      {!hasSvi && (
        <span className="text-[9px] rounded border border-amber-800 bg-amber-950 text-amber-300 px-1 py-0.5 shrink-0">no SVI</span>
      )}
      <span className={`ml-auto ${statusTone} shrink-0`}>{statusText}</span>
    </li>
  );
}

// ---------- Placeholder ----------

function PlaceholderSection({
  label,
  sub,
  colSpan,
  wrap = false,
}: {
  label: string;
  sub: string;
  colSpan: string;
  wrap?: boolean;
}) {
  const content = (
    <section className={`${colSpan} col-span-12 rounded border border-dashed border-neutral-800 bg-neutral-900/30`}>
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">{label}</span>
        <span className="font-mono text-[10px] text-neutral-600">coming this session</span>
      </div>
      <div className="px-6 py-12 text-center">
        <p className="font-mono text-xs text-neutral-500">{sub}</p>
      </div>
    </section>
  );

  if (wrap) {
    return <div className="mt-3 grid grid-cols-12 gap-3">{content}</div>;
  }
  return content;
}