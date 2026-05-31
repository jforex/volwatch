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
      .map((o): Row => ({
        oracleId: o.oracleId,
        forward: o.forward,
        expiryMs: o.expiryMs,
        minsToExpiry: o.expiryMs !== undefined ? Math.round((o.expiryMs - now) / 60000) : undefined,
        atmIvPct: o.svi ? atmIV(o.svi) * 100 : undefined,
        hasFullState: !!(o.svi && o.forward && o.expiryMs),
      }));
    list.sort((a, b) => (a.expiryMs ?? 0) - (b.expiryMs ?? 0));
    return list;
  }, [oracles]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500 shadow-sm">
        Waiting for active oracles…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">Active oracles</h2>
        <p className="mt-1 text-xs text-neutral-500">{rows.length} live · sorted by expiry · click to focus</p>
      </div>
      <ul className="divide-y divide-neutral-200 font-mono text-sm">
        {rows.map((r) => {
          const isSelected = r.oracleId === selectedId;
          return (
            <li key={r.oracleId}>
              <button
                onClick={() => onSelect(r.oracleId)}
                className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors ${
                  isSelected ? "bg-indigo-50 ring-2 ring-inset ring-indigo-300" : "hover:bg-neutral-50"
                }`}
              >
                <div className="flex flex-col">
                  <span className={isSelected ? "text-indigo-700 font-bold" : "text-neutral-900 font-semibold"}>{shortId(r.oracleId)}</span>
                  <span className="text-xs text-neutral-500 mt-0.5">{r.minsToExpiry !== undefined ? `expires in ${r.minsToExpiry}m` : "no expiry"}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-neutral-900 font-bold">{r.atmIvPct !== undefined ? `${r.atmIvPct.toFixed(1)}%` : "—"}</span>
                  <span className="text-xs text-neutral-500 mt-0.5">{r.forward !== undefined ? formatUSD(r.forward) : "—"}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
