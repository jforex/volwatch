"use client";

import { useMemo } from "react";
import { OracleState } from "../lib/useVolStream";
import {
  checkButterfly,
  checkAllCalendars,
  ButterflyCheck,
  CalendarPair,
} from "../lib/arbitrage";
import { shortId } from "../lib/format";

type Props = {
  oracles: Record<string, OracleState>;
};

export function ArbCheck({ oracles }: Props) {
  const { butterflies, calendars, stats } = useMemo(() => {
    const now = Date.now();
    const fullyStated = Object.values(oracles).filter(
      (o) =>
        o.svi &&
        o.forward &&
        o.expiryMs &&
        o.expiryMs > now,
    ) as Array<{
      oracleId: string;
      svi: NonNullable<OracleState["svi"]>;
      forward: number;
      expiryMs: number;
    }>;

    const butterflies = fullyStated.map((o) => ({
      oracleId: o.oracleId,
      expiryMs: o.expiryMs,
      check: checkButterfly(o.svi),
    }));

    const calendars = checkAllCalendars(
      fullyStated.map((o) => ({
        oracleId: o.oracleId,
        svi: o.svi,
        expiryMs: o.expiryMs,
        forward: o.forward,
      })),
    );

    const butterflyViolations = butterflies.filter(
      (b) => b.check.severity === "violation",
    ).length;
    const butterflyWarns = butterflies.filter(
      (b) => b.check.severity === "warn",
    ).length;
    const calendarViolations = calendars.filter(
      (c) => c.severity === "violation",
    ).length;
    const calendarWarns = calendars.filter(
      (c) => c.severity === "warn",
    ).length;

    return {
      butterflies,
      calendars,
      stats: {
        total: fullyStated.length,
        butterflyViolations,
        butterflyWarns,
        calendarTotal: calendars.length,
        calendarViolations,
        calendarWarns,
      },
    };
  }, [oracles]);

  if (stats.total === 0) {
    return (
      <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-6 text-center text-sm text-neutral-600">
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

  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Arbitrage-free check
          </h2>
          <p className="mt-1 text-[10px] text-neutral-600">
            Butterfly (per expiry) · Calendar (adjacent expiries) · Gatheral
            conditions
          </p>
        </div>
        <SeverityBadge severity={overallSeverity} />
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 gap-4 border-b border-neutral-900 pb-4">
        <Summary
          title="Butterfly"
          subtitle={`${stats.total} oracles checked`}
          violations={stats.butterflyViolations}
          warns={stats.butterflyWarns}
          passed={
            stats.total - stats.butterflyViolations - stats.butterflyWarns
          }
        />
        <Summary
          title="Calendar"
          subtitle={`${stats.calendarTotal} pairs checked`}
          violations={stats.calendarViolations}
          warns={stats.calendarWarns}
          passed={
            stats.calendarTotal -
            stats.calendarViolations -
            stats.calendarWarns
          }
        />
      </div>

      {/* Butterfly list */}
      <div className="mt-4">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Butterfly results
        </h3>
        <ul className="mt-2 divide-y divide-neutral-900 font-mono text-xs">
          {butterflies.slice(0, 8).map((b) => (
            <ButterflyRow
              key={b.oracleId}
              oracleId={b.oracleId}
              expiryMs={b.expiryMs}
              check={b.check}
            />
          ))}
        </ul>
        {butterflies.length > 8 && (
          <p className="mt-2 text-[10px] text-neutral-600">
            +{butterflies.length - 8} more
          </p>
        )}
      </div>

      {/* Calendar list */}
      {calendars.length > 0 && (
        <div className="mt-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
            Calendar pairs
          </h3>
          <ul className="mt-2 divide-y divide-neutral-900 font-mono text-xs">
            {calendars.slice(0, 6).map((c, i) => (
              <CalendarRow key={i} pair={c} />
            ))}
          </ul>
          {calendars.length > 6 && (
            <p className="mt-2 text-[10px] text-neutral-600">
              +{calendars.length - 6} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "ok" | "warn" | "violation" }) {
  if (severity === "violation") {
    return (
      <span className="rounded border border-red-900/60 bg-red-950 px-2 py-0.5 text-xs text-red-400">
        ✗ violations
      </span>
    );
  }
  if (severity === "warn") {
    return (
      <span className="rounded border border-amber-900/60 bg-amber-950 px-2 py-0.5 text-xs text-amber-400">
        ⚠ marginal
      </span>
    );
  }
  return (
    <span className="rounded border border-emerald-900/60 bg-emerald-950 px-2 py-0.5 text-xs text-emerald-400">
      ✓ arb-free
    </span>
  );
}

function Summary({
  title,
  subtitle,
  passed,
  warns,
  violations,
}: {
  title: string;
  subtitle: string;
  passed: number;
  warns: number;
  violations: number;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-neutral-500">
        {title}
      </p>
      <p className="mt-0.5 text-[10px] text-neutral-600">{subtitle}</p>
      <div className="mt-2 flex gap-3 font-mono text-xs">
        <span className="text-emerald-400">✓ {passed}</span>
        {warns > 0 && <span className="text-amber-400">⚠ {warns}</span>}
        {violations > 0 && <span className="text-red-400">✗ {violations}</span>}
      </div>
    </div>
  );
}

function ButterflyRow({
  oracleId,
  expiryMs,
  check,
}: {
  oracleId: string;
  expiryMs: number;
  check: ButterflyCheck;
}) {
  const minsToExpiry = Math.round((expiryMs - Date.now()) / 60000);
  const color =
    check.severity === "ok"
      ? "text-emerald-400"
      : check.severity === "warn"
      ? "text-amber-400"
      : "text-red-400";
  const icon =
    check.severity === "ok" ? "✓" : check.severity === "warn" ? "⚠" : "✗";

  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className={`w-4 ${color}`}>{icon}</span>
      <span className="text-neutral-400">{shortId(oracleId)}</span>
      <span className="text-[10px] text-neutral-600">in {minsToExpiry}m</span>
      <span className="ml-auto text-neutral-500">
        min g ={" "}
        <span className={color}>
          {check.minG.toFixed(4)}
        </span>
      </span>
    </li>
  );
}

function CalendarRow({ pair }: { pair: CalendarPair }) {
  const color =
    pair.severity === "ok"
      ? "text-emerald-400"
      : pair.severity === "warn"
      ? "text-amber-400"
      : "text-red-400";
  const icon =
    pair.severity === "ok" ? "✓" : pair.severity === "warn" ? "⚠" : "✗";
  const shortMins = Math.round((pair.shortExpiryMs - Date.now()) / 60000);
  const longMins = Math.round((pair.longExpiryMs - Date.now()) / 60000);

  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className={`w-4 ${color}`}>{icon}</span>
      <span className="text-neutral-400">
        {shortId(pair.shortOracleId)} → {shortId(pair.longOracleId)}
      </span>
      <span className="text-[10px] text-neutral-600">
        {shortMins}m → {longMins}m
      </span>
      <span className="ml-auto text-neutral-500">
        Δw ={" "}
        <span className={color}>
          {(pair.worstLongTotalVar - pair.worstShortTotalVar).toFixed(5)}
        </span>
      </span>
    </li>
  );
}
