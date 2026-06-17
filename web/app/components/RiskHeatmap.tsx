"use client";

import { useMemo } from "react";
import type { ExposureSnapshot, OracleExposure } from "../lib/useVolStream";

type Props = {
  exposure: ExposureSnapshot | null;
  now: number;
  oracleExpiries: Record<string, number>; // oracleId → expiryMs (from oracles map)
};

// Visual grid: 10 strike bins (columns) × N expiries (rows, sorted by time-to-expiry)
const STRIKE_BIN_COUNT = 10;
const MAX_ROWS = 14;

export function RiskHeatmap({ exposure, now, oracleExpiries }: Props) {
  const { rows, globalMaxAbs, strikePctRange, totalNetExposure } = useMemo(() => {
    if (!exposure || exposure.oracles.length === 0) {
      return { rows: [], globalMaxAbs: 0, strikePctRange: [0, 0] as [number, number], totalNetExposure: 0 };
    }

   // Step 1: filter to oracles with expiry data still in the future
    // Prefer expiry from the exposure payload itself (backend-enriched), fall back to client map
    const oraclesWithExpiry = exposure.oracles
      .map((o) => ({ o, expiryMs: o.expiryMs ?? oracleExpiries[o.oracleId] }))
      .filter(({ expiryMs }) => expiryMs && expiryMs > now)
      .sort((a, b) => (a.expiryMs! - b.expiryMs!))
      .slice(0, MAX_ROWS);

    if (oraclesWithExpiry.length === 0) {
      return { rows: [], globalMaxAbs: 0, strikePctRange: [0, 0] as [number, number], totalNetExposure: 0 };
    }

    // Step 2: pick a representative spot (use the middle of the median oracle's strike range)
    const allStrikes = oraclesWithExpiry.flatMap(({ o }) =>
      o.bins.map((b) => b.strikeMid),
    );
    if (allStrikes.length === 0) {
      return { rows: [], globalMaxAbs: 0, strikePctRange: [0, 0] as [number, number], totalNetExposure: 0 };
    }
    // Reference spot: median of all bin midpoints — robust to outliers
    const sorted = [...allStrikes].sort((a, b) => a - b);
    const refSpot = sorted[Math.floor(sorted.length / 2)];

    // Step 3: project every bin into log-moneyness vs refSpot, then bin into STRIKE_BIN_COUNT columns
    // Strike range: -30% to +30% moneyness (k_min = ln(0.7), k_max = ln(1.3))
    const K_MIN = Math.log(0.7);
    const K_MAX = Math.log(1.3);
    const binWidth = (K_MAX - K_MIN) / STRIKE_BIN_COUNT;

    type Row = {
      oracleId: string;
      expiryMs: number;
      minutesToExpiry: number;
      bins: { netByCol: number[]; upByCol: number[]; dnByCol: number[] };
      totalNet: number;
    };

    let globalMaxAbs = 0;
    let totalNetExposure = 0;

    const rowsArr: Row[] = oraclesWithExpiry.map(({ o, expiryMs }) => {
      const netByCol = new Array(STRIKE_BIN_COUNT).fill(0);
      const upByCol = new Array(STRIKE_BIN_COUNT).fill(0);
      const dnByCol = new Array(STRIKE_BIN_COUNT).fill(0);
      let rowNet = 0;

      for (const bin of o.bins) {
        const k = Math.log(bin.strikeMid / refSpot);
        const col = Math.floor((k - K_MIN) / binWidth);
        if (col < 0 || col >= STRIKE_BIN_COUNT) continue;
        netByCol[col] += bin.net;
        upByCol[col] += bin.notionalUp;
        dnByCol[col] += bin.notionalDn;
        rowNet += bin.net;
      }

      for (const v of netByCol) {
        const abs = Math.abs(v);
        if (abs > globalMaxAbs) globalMaxAbs = abs;
      }
      totalNetExposure += rowNet;

      return {
        oracleId: o.oracleId,
        expiryMs: expiryMs!,
        minutesToExpiry: Math.round((expiryMs! - now) / 60000),
        bins: { netByCol, upByCol, dnByCol },
        totalNet: rowNet,
      };
    });

    // Build column labels (log-moneyness midpoints → % from refSpot)
    const colLabels: number[] = [];
    for (let i = 0; i < STRIKE_BIN_COUNT; i++) {
      const kMid = K_MIN + binWidth * (i + 0.5);
      const pct = (Math.exp(kMid) - 1) * 100;
      colLabels.push(pct);
    }

    return {
      rows: rowsArr.map((r) => ({ ...r, colLabels })),
      globalMaxAbs,
      strikePctRange: [colLabels[0], colLabels[colLabels.length - 1]] as [number, number],
      totalNetExposure,
    };
  }, [exposure, now, oracleExpiries]);

  if (!exposure) {
    return (
      <section className="rounded border border-neutral-800 bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-300">RISK EXPOSURE HEATMAP</span>
          <span className="font-mono text-xs text-neutral-200">waiting for exposure data</span>
        </div>
        <div className="p-8 text-center font-mono text-xs text-neutral-300">
          Loading on-chain strike matrix data…
          <p className="mt-1 text-neutral-500">First fetch can take up to 30 seconds.</p>
        </div>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="rounded border border-neutral-800 bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-300">RISK EXPOSURE HEATMAP</span>
          <span className="font-mono text-xs text-neutral-200">no active positions</span>
        </div>
        <div className="p-8 text-center font-mono text-xs text-neutral-300">
          No active strike matrices with minted positions.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <span className="font-mono text-xs uppercase tracking-widest text-neutral-300">RISK EXPOSURE HEATMAP</span>
        <span className="font-mono text-xs text-neutral-200">
          on-chain strike matrices · {exposure.oracles.length} oracles · {rows.length} active expiries
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {/* Explainer */}
        <div className="mb-4 rounded border border-neutral-800 bg-neutral-950/60 px-3 py-2.5">
          <p className="font-mono text-xs text-neutral-200 leading-relaxed">
            Per-oracle net exposure (calls minus puts) across strike buckets. <span className="text-emerald-400">Green</span> = vault is net short calls (loses if BTC rallies through this strike).{" "}
            <span className="text-red-400">Red</span> = vault is net short puts (loses if BTC drops through this strike). Intensity = magnitude vs the biggest cell.
          </p>
        </div>

        {/* Heatmap grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs">
            <thead>
              <tr>
                <th className="text-left text-neutral-400 font-bold uppercase tracking-widest pb-2 pr-3 sticky left-0 bg-neutral-900">
                  EXPIRY \\ STRIKE
                </th>
                {(rows[0] as any).colLabels.map((pct: number, i: number) => (
                  <th
                    key={i}
                    className={`text-center text-xs font-bold pb-2 px-1 ${
                      Math.abs(pct) < 4 ? "text-blue-300" : "text-neutral-400"
                    }`}
                  >
                    {pct >= 0 ? "+" : ""}{pct.toFixed(0)}%
                  </th>
                ))}
                <th className="text-right text-neutral-400 font-bold uppercase tracking-widest pb-2 pl-3">
                  ROW NET
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.oracleId} className="border-t border-neutral-800/50">
                  <td className="text-neutral-300 py-1.5 pr-3 sticky left-0 bg-neutral-900 whitespace-nowrap">
                    {row.minutesToExpiry < 60
                      ? `${row.minutesToExpiry}m`
                      : `${(row.minutesToExpiry / 60).toFixed(1)}h`}
                    <span className="text-neutral-600 ml-2">{row.oracleId.slice(0, 6)}…</span>
                  </td>
                  {row.bins.netByCol.map((net: number, i: number) => {
                    const up = row.bins.upByCol[i];
                    const dn = row.bins.dnByCol[i];
                    return <HeatCell key={i} net={net} up={up} dn={dn} globalMaxAbs={globalMaxAbs} />;
                  })}
                  <td className={`text-right font-bold py-1.5 pl-3 ${
                    row.totalNet > 0 ? "text-emerald-400" : row.totalNet < 0 ? "text-red-400" : "text-neutral-500"
                  }`}>
                    {row.totalNet === 0 ? "—" : (row.totalNet > 0 ? "+" : "") + row.totalNet.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend + summary */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-neutral-800 pt-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 font-bold">STRIKE RANGE</p>
            <p className="mt-1 font-mono text-sm text-neutral-200">
              {strikePctRange[0].toFixed(0)}% — {strikePctRange[1].toFixed(0)}% from ref spot
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 font-bold">PEAK CELL EXPOSURE</p>
            <p className="mt-1 font-mono text-sm text-neutral-200">{globalMaxAbs.toFixed(2)} notional</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 font-bold">TOTAL NET EXPOSURE</p>
            <p className={`mt-1 font-mono text-sm font-bold ${
              totalNetExposure > 0 ? "text-emerald-400" : totalNetExposure < 0 ? "text-red-400" : "text-neutral-200"
            }`}>
              {totalNetExposure === 0 ? "balanced" : `${totalNetExposure > 0 ? "+" : ""}${totalNetExposure.toFixed(2)}`}
            </p>
          </div>
        </div>

        <p className="mt-3 font-mono text-xs text-neutral-500 leading-relaxed">
          Data source: <span className="text-neutral-400">vault.oracle_matrices</span> on-chain Table.
          Pages tree leaves aggregated into {STRIKE_BIN_COUNT} log-moneyness buckets per oracle.
          Strike % is approximate — computed vs median strike across all active oracles.
        </p>
      </div>
    </section>
  );
}

function HeatCell({ net, up, dn, globalMaxAbs }: { net: number; up: number; dn: number; globalMaxAbs: number }) {
  const intensity = globalMaxAbs > 0 ? Math.min(1, Math.abs(net) / globalMaxAbs) : 0;
  const isEmpty = up === 0 && dn === 0;

  // Color: green for net long calls, red for net short puts (negative net)
  // The vault is the counterparty — high green = high call-side risk if BTC rallies; high red = high put-side risk if BTC drops
  let bg: string;
  let textColor: string;
  if (isEmpty) {
    bg = "bg-neutral-950/50";
    textColor = "text-neutral-700";
  } else if (net > 0) {
    // Net call exposure (rally risk for vault)
    const opacity = 0.15 + intensity * 0.65;
    bg = `bg-emerald-500`;
    textColor = intensity > 0.5 ? "text-white" : "text-emerald-200";
    return (
      <td
        className={`text-center py-1.5 px-1 text-xs font-bold ${textColor} relative`}
        style={{ backgroundColor: `rgba(16, 185, 129, ${opacity})` }}
        title={`Net: +${net.toFixed(2)}\nCalls (up): ${up.toFixed(2)}\nPuts (dn): ${dn.toFixed(2)}`}
      >
        {intensity > 0.15 ? `+${net.toFixed(1)}` : ""}
      </td>
    );
  } else if (net < 0) {
    const opacity = 0.15 + intensity * 0.65;
    textColor = intensity > 0.5 ? "text-white" : "text-red-200";
    return (
      <td
        className={`text-center py-1.5 px-1 text-xs font-bold ${textColor} relative`}
        style={{ backgroundColor: `rgba(239, 68, 68, ${opacity})` }}
        title={`Net: ${net.toFixed(2)}\nCalls (up): ${up.toFixed(2)}\nPuts (dn): ${dn.toFixed(2)}`}
      >
        {intensity > 0.15 ? net.toFixed(1) : ""}
      </td>
    );
  } else {
    bg = "bg-neutral-900/40";
    textColor = "text-neutral-600";
  }

  return (
    <td
      className={`text-center py-1.5 px-1 text-xs ${bg} ${textColor}`}
      title={isEmpty ? "No positions" : `Net: ${net.toFixed(2)}`}
    >
      {isEmpty ? "·" : ""}
    </td>
  );
}