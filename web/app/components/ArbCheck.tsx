"use client";

import { useMemo } from "react";
import { OracleState } from "../lib/useVolStream";
import { checkButterfly, checkAllCalendars, ButterflyCheck, CalendarPair } from "../lib/arbitrage";
import { shortId } from "../lib/format";

type Props = { oracles: Record<string, OracleState> };

export function ArbCheck({ oracles }: Props) {
  const { butterflies, calendars, stats } = useMemo(() => {
    const now = Date.now();
    const fullyStated = Object.values(oracles).filter(
      (o) => o.svi && o.forward && o.expiryMs && o.expiryMs > now,
    ) as Array<{ oracleId: string; svi: NonNullable<OracleState["svi"]>; forward: number; expiryMs: number }>;

    const butterflies = fullyStated.map((o) => ({ oracleId: o.oracleId, expiryMs: o.expiryMs, check: checkButterfly(o.svi) }));
    const calendars = checkAllCalendars(fullyStated.map((o) => ({ oracleId: o.oracleId, svi: o.svi, expiryMs: o.expiryMs, forward: o.forward })));

    const butterflyViolations = butterflies.filter((b) => b.check.severity === "violation").length;
    const butterflyWarns = butterflies.filter((b) => b.check.severity === "warn").length;
    const calendarViolations = calendars.filter((c) => c.severity === "violation").length;
    const calendarWarns = calendars.filter((c) => c.severity === "warn").length;

    return { butterflies, calendars, stats: { total: fullyStated.length, butterflyViolations, butterflyWarns, calendarTotal: calendars.length, calendarViolations, calendarWarns } };
  }, [oracles]);

  if (stats.total === 0) {
    return (
      <div className="rounded border border-neutral-800 bg-neutral-900 p-6 text-center font-mono text-xs text-neutral-500">
        Waiting for oracle data to run arb checks…
      </div>
    );
  }

  const overallSeverity =
    stats.butterflyViolations > 0 || stats.calendarViolations > 0
      ? "violation"
      : stats.butterflyWarns > 0 || stats.calendarWarns > 0
        ? "warn"
        : "ok";

  // Severity-based banner tint
  const bannerTint =
    overallSeverity === "violation"
      ? "border-red-500/40 bg-red-950/30"
      : overallSeverity === "warn"
        ? "border-amber-500/40 bg-amber-950/30"
        : "border-emerald-500/30 bg-emerald-950/20";

  const bannerHeadline =
    overallSeverity === "violation"
      ? "ARBITRAGE OPPORTUNITY DETECTED"
      : overallSeverity === "warn"
        ? "MARGINAL CONDITIONS"
        : "SURFACE IS ARB-FREE";

  const bannerSub =
    overallSeverity === "violation"
      ? "One or more conditions violated — see breakdown below."
      : overallSeverity === "warn"
        ? "Conditions are close to bounds. Worth watching."
        : "All Gatheral conditions hold. No exploitable mispricing.";

  return (
    <div className="space-y-3">
      {/* Severity banner */}
      <div className={`rounded border px-4 py-3 ${bannerTint}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <SeverityIcon severity={overallSeverity} large />
            <div className="min-w-0">
              <p className={`font-mono text-[11px] sm:text-xs uppercase tracking-widest font-bold ${
                overallSeverity === "violation" ? "text-red-300" :
                overallSeverity === "warn" ? "text-amber-300" :
                "text-emerald-300"
              }`}>
                {bannerHeadline}
              </p>
              <p className="mt-0.5 text-[11px] sm:text-xs text-neutral-400 truncate">{bannerSub}</p>
            </div>
          </div>
          <SeverityBadge severity={overallSeverity} />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <Summary
          title="Butterfly"
          subtitle={`${stats.total} expiries checked`}
          violations={stats.butterflyViolations}
          warns={stats.butterflyWarns}
          passed={stats.total - stats.butterflyViolations - stats.butterflyWarns}
        />
        <Summary
          title="Calendar"
          subtitle={`${stats.calendarTotal} pairs checked`}
          violations={stats.calendarViolations}
          warns={stats.calendarWarns}
          passed={stats.calendarTotal - stats.calendarViolations - stats.calendarWarns}
        />
      </div>

      {/* Butterfly results */}
      <div className="rounded border border-neutral-800 bg-neutral-900/60">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">BUTTERFLY RESULTS</span>
          <span className="font-mono text-[10px] text-neutral-600">per-expiry · Gatheral g(k) ≥ 0</span>
        </div>
        <ul className="divide-y divide-neutral-800/60 font-mono text-xs">
          {butterflies.slice(0, 8).map((b) => (
            <ButterflyRow key={b.oracleId} oracleId={b.oracleId} expiryMs={b.expiryMs} check={b.check} />
          ))}
        </ul>
        {butterflies.length > 8 && (
          <p className="border-t border-neutral-800 px-4 py-2 font-mono text-[10px] text-neutral-600">+{butterflies.length - 8} more</p>
        )}
      </div>

      {/* Calendar pairs */}
      {calendars.length > 0 && (
        <div className="rounded border border-neutral-800 bg-neutral-900/60">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">CALENDAR PAIRS</span>
            <span className="font-mono text-[10px] text-neutral-600">adjacent expiries · w(long) ≥ w(short)</span>
          </div>
          <ul className="divide-y divide-neutral-800/60 font-mono text-xs">
            {calendars.slice(0, 6).map((c, i) => (<CalendarRow key={i} pair={c} />))}
          </ul>
          {calendars.length > 6 && (
            <p className="border-t border-neutral-800 px-4 py-2 font-mono text-[10px] text-neutral-600">+{calendars.length - 6} more</p>
          )}
        </div>
      )}
    </div>
  );
}

function SeverityIcon({ severity, large = false }: { severity: "ok" | "warn" | "violation"; large?: boolean }) {
  const size = large ? "h-2.5 w-2.5" : "h-2 w-2";
  const color =
    severity === "violation" ? "bg-red-500" :
    severity === "warn" ? "bg-amber-500" :
    "bg-emerald-500";
  return <span className={`inline-block rounded-full ${size} ${color} ${severity === "violation" ? "animate-pulse" : ""}`} />;
}

function SeverityBadge({ severity }: { severity: "ok" | "warn" | "violation" }) {
  if (severity === "violation") {
    return (
      <span className="shrink-0 rounded border border-red-500/40 bg-red-950/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-red-300 font-bold">
        ✗ violations
      </span>
    );
  }
  if (severity === "warn") {
    return (
      <span className="shrink-0 rounded border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-amber-300 font-bold">
        ⚠ marginal
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-300 font-bold">
      ✓ arb-free
    </span>
  );
}

function Summary({ title, subtitle, passed, warns, violations }: { title: string; subtitle: string; passed: number; warns: number; violations: number }) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900/60 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{title}</p>
      <p className="mt-0.5 font-mono text-[10px] text-neutral-600">{subtitle}</p>
      <div className="mt-2 flex gap-3 sm:gap-4 font-mono text-xs font-bold">
        <span className="text-emerald-400">✓ {passed}</span>
        {warns > 0 && <span className="text-amber-400">⚠ {warns}</span>}
        {violations > 0 && <span className="text-red-400">✗ {violations}</span>}
      </div>
    </div>
  );
}

function ButterflyRow({ oracleId, expiryMs, check }: { oracleId: string; expiryMs: number; check: ButterflyCheck }) {
  const minsToExpiry = Math.round((expiryMs - Date.now()) / 60000);
  const tone =
    check.severity === "ok" ? "text-emerald-400" :
    check.severity === "warn" ? "text-amber-400" :
    "text-red-400";
  const icon = check.severity === "ok" ? "✓" : check.severity === "warn" ? "⚠" : "✗";
  return (
    <li className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-800/40">
      <span className={`w-4 font-bold shrink-0 ${tone}`}>{icon}</span>
      <span className="text-neutral-300 shrink-0">{shortId(oracleId)}</span>
      <span className="text-[10px] text-neutral-500 shrink-0">in {minsToExpiry}m</span>
      <span className="ml-auto text-neutral-400 truncate">
        min g = <span className={`${tone} font-bold`}>{check.minG.toFixed(4)}</span>
      </span>
    </li>
  );
}

function CalendarRow({ pair }: { pair: CalendarPair }) {
  const tone =
    pair.severity === "ok" ? "text-emerald-400" :
    pair.severity === "warn" ? "text-amber-400" :
    "text-red-400";
  const icon = pair.severity === "ok" ? "✓" : pair.severity === "warn" ? "⚠" : "✗";
  const shortMins = Math.round((pair.shortExpiryMs - Date.now()) / 60000);
  const longMins = Math.round((pair.longExpiryMs - Date.now()) / 60000);
  return (
    <li className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-800/40">
      <span className={`w-4 font-bold shrink-0 ${tone}`}>{icon}</span>
      <span className="text-neutral-300 shrink-0">
        {shortId(pair.shortOracleId)} → {shortId(pair.longOracleId)}
      </span>
      <span className="text-[10px] text-neutral-500 shrink-0">{shortMins}m → {longMins}m</span>
      <span className="ml-auto text-neutral-400 truncate">
        Δw = <span className={`${tone} font-bold`}>{(pair.worstLongTotalVar - pair.worstShortTotalVar).toFixed(5)}</span>
      </span>
    </li>
  );
}