"use client";

import { useMemo } from "react";
import { OracleState } from "../lib/useVolStream";
import { atmIV } from "../lib/svi";
import { shortId, formatUSD } from "../lib/format";

type Props = {
  oracles: Record<string, OracleState>;
  selectedId: string | null;
  onSelect: (oracleId: string) => void;
};

type Row = {
  oracleId: string;
  forward?: number;
  expiryMs?: number;
  minsToExpiry?: number;
  atmIvPct?: number;
  hasFullState: boolean;
};

export function OracleList({ oracles, selectedId, onSelect }: Props) {
  const rows = useMemo<Row[]>(() => {
    const now = Date.now();
    const list = Object.values(oracles)
      .filter((o) => o.expiryMs !== undefined && o.expiryMs > now)
      .map((o): Row => {
        const hasFullState = !!(o.svi && o.forward && o.expiryMs);
        const atmIvPct = o.svi ? atmIV(o.svi) * 100 : undefined;
        const minsToExpiry =
          o.expiryMs !== undefined
            ? Math.round((o.expiryMs - now) / 60000)
            : undefined;
        return {
          oracleId: o.oracleId,
          forward: o.forward,
          expiryMs: o.expiryMs,
          minsToExpiry,
          atmIvPct,
          hasFullState,
        };
      });
    // Sort by nearest expiry first
    list.sort((a, b) => (a.expiryMs ?? 0) - (b.expiryMs ?? 0));
    return list;
  }, [oracles]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-6 text-center text-sm text-neutral-600">
        Waiting for active oracles…
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950">
      <div className="border-b border-neutral-900 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Active oracles
        </h2>
        <p className="mt-0.5 text-[10px] text-neutral-600">
          {rows.length} live · sorted by expiry · click to focus
        </p>
      </div>
      <ul className="divide-y divide-neutral-900 font-mono text-xs">
        {rows.map((r) => {
          const isSelected = r.oracleId === selectedId;
          return (
            <li key={r.oracleId}>
              <button
                onClick={() => onSelect(r.oracleId)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                  isSelected
                    ? "bg-amber-950/30 ring-1 ring-inset ring-amber-900/60"
                    : "hover:bg-neutral-900/50"
                }`}
              >
                <div className="flex flex-col">
                  <span
                    className={
                      isSelected ? "text-amber-400" : "text-neutral-300"
                    }
                  >
                    {shortId(r.oracleId)}
                  </span>
                  <span className="text-[10px] text-neutral-600">
                    {r.minsToExpiry !== undefined
                      ? `expires in ${r.minsToExpiry}m`
                      : "no expiry"}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-neutral-300">
                    {r.atmIvPct !== undefined
                      ? `${r.atmIvPct.toFixed(1)}%`
                      : "—"}
                  </span>
                  <span className="text-[10px] text-neutral-600">
                    {r.forward !== undefined ? formatUSD(r.forward) : "—"}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
