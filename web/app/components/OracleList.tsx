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
        atmIvPct: o.svi && o.expiryMs ? atmIV(o.svi, (o.expiryMs - now) / (365.25 * 24 * 3600 * 1000)) * 100 : undefined,
        hasFullState: !!(o.svi && o.forward && o.expiryMs),
      }));
    list.sort((a, b) => (a.expiryMs ?? 0) - (b.expiryMs ?? 0));
    return list;
  }, [oracles]);

  if (rows.length === 0) {
    return (
      <div className="text-center font-mono text-xs text-neutral-300 py-8">
        Waiting for active oracles…
      </div>
    );
  }

  return (
    <ul className="divide-y divide-neutral-800 font-mono text-xs max-h-[420px] overflow-y-auto">
      {rows.map((r) => {
        const isSelected = r.oracleId === selectedId;
        return (
          <li key={r.oracleId}>
            <button
              onClick={() => onSelect(r.oracleId)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors ${
                isSelected
                  ? "bg-blue-950/40 border-l-2 border-blue-500"
                  : "border-l-2 border-transparent hover:bg-neutral-800/50"
              }`}
            >
              <div className="flex flex-col min-w-0">
                <span className={`truncate ${isSelected ? "text-blue-300 font-bold" : "text-neutral-100 font-semibold"}`}>
                  {shortId(r.oracleId)}
                </span>
                <span className="text-xs text-neutral-300 mt-0.5">
                  {r.minsToExpiry !== undefined ? `expires in ${r.minsToExpiry}m` : "no expiry"}
                  {!r.hasFullState && <span className="ml-2 text-amber-400">· no SVI</span>}
                </span>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className={`font-bold ${isSelected ? "text-blue-300" : "text-white"}`}>
                  {r.atmIvPct !== undefined ? `${r.atmIvPct.toFixed(1)}%` : "—"}
                </span>
                <span className="text-xs text-neutral-300 mt-0.5">
                  {r.forward !== undefined ? formatUSD(r.forward) : "—"}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}