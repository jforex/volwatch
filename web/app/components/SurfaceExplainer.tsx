"use client";

import { useMemo } from "react";
import { OracleState, VaultSnapshot } from "../lib/useVolStream";
import { explainSurface, Observation } from "../lib/explainer";

type Props = {
  oracles: Record<string, OracleState>;
  vault: VaultSnapshot | null;
  latestSpot: number | null;
};

export function SurfaceExplainer({ oracles, vault, latestSpot }: Props) {
  const observations = useMemo(() => explainSurface(oracles, vault, latestSpot), [oracles, vault, latestSpot]);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">Surface explainer</h2>
          <p className="mt-1 text-xs text-neutral-300">What a trader should notice right now</p>
        </div>
        <span className="text-xs text-neutral-300">{observations.length} observation{observations.length === 1 ? "" : "s"}</span>
      </div>

      {observations.length === 0 ? (
        <div className="py-6 text-center text-sm text-neutral-300">Quiet surface. Nothing notable.</div>
      ) : (
        <ul className="space-y-3">
          {observations.map((o, i) => (<ObservationRow key={i} o={o} />))}
        </ul>
      )}
    </div>
  );
}

function ObservationRow({ o }: { o: Observation }) {
  const palette = paletteFor(o.severity);
  return (
    <li className={`rounded-md border ${palette.border} ${palette.bg} px-4 py-3`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 font-mono text-base font-bold ${palette.icon}`}>{iconFor(o.severity)}</span>
        <div className="flex-1">
          <p className={`text-base font-bold ${palette.title}`}>{o.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-neutral-700">{o.detail}</p>
        </div>
      </div>
    </li>
  );
}

function iconFor(s: Observation["severity"]) {
  switch (s) {
    case "info": return "·";
    case "notable": return "◆";
    case "warning": return "⚠";
    case "alert": return "✗";
  }
}

function paletteFor(s: Observation["severity"]) {
  switch (s) {
    case "info": return { border: "border-neutral-200", bg: "bg-neutral-50", icon: "text-neutral-300", title: "text-neutral-900" };
    case "notable": return { border: "border-sky-200", bg: "bg-sky-50", icon: "text-sky-700", title: "text-sky-900" };
    case "warning": return { border: "border-amber-200", bg: "bg-amber-50", icon: "text-amber-700", title: "text-amber-900" };
    case "alert": return { border: "border-red-200", bg: "bg-red-50", icon: "text-red-700", title: "text-red-900" };
  }
}
