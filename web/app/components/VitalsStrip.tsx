"use client";

import { useMemo } from "react";
import { OracleState, VaultSnapshot } from "../lib/useVolStream";
import { computeVitals, Vital, VitalLevel } from "../lib/vitals";

type Props = { oracles: Record<string, OracleState>; vault: VaultSnapshot | null };

export function VitalsStrip({ oracles, vault }: Props) {
  const vitals = useMemo(() => computeVitals(oracles, vault), [oracles, vault]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">Market vitals</h2>
          <p className="mt-1 text-xs text-neutral-500">At-a-glance status. Read the bars.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {vitals.map((v) => (<VitalCard key={v.id} v={v} />))}
      </div>
    </div>
  );
}

function VitalCard({ v }: { v: Vital }) {
  const palette = paletteFor(v.level);
  return (
    <div className={`rounded-lg border ${palette.border} ${palette.bg} p-3 sm:p-4`}>
      <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">{v.label}</p>
      <p className={`mt-1.5 sm:mt-2 text-base sm:text-lg font-bold ${palette.statusText}`}>{v.status}</p>
      <div className="mt-2 sm:mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
        <div className={`h-full ${palette.bar} transition-all`} style={{ width: `${Math.max(4, v.score)}%` }} />
      </div>
      <p className="mt-2 sm:mt-3 text-xs leading-relaxed text-neutral-600">{v.detail}</p>
    </div>
  );
}

function paletteFor(level: VitalLevel) {
  switch (level) {
    case "good": return { border: "border-emerald-200", bg: "bg-emerald-50", statusText: "text-emerald-700", bar: "bg-emerald-500" };
    case "watch": return { border: "border-amber-200", bg: "bg-amber-50", statusText: "text-amber-700", bar: "bg-amber-500" };
    case "alert": return { border: "border-red-200", bg: "bg-red-50", statusText: "text-red-700", bar: "bg-red-500" };
    case "neutral": return { border: "border-neutral-200", bg: "bg-neutral-50", statusText: "text-neutral-700", bar: "bg-neutral-400" };
  }
}
