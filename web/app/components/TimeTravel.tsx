"use client";

import { useEffect } from "react";

type Props = {
  scrubTs: number | null;
  setScrubTs: (ts: number | null) => void;
  scrubRange: { min: number; max: number } | null;
  isScrubbing: boolean;
  goLive: () => void;
};

export function TimeTravel({ scrubTs, setScrubTs, scrubRange, isScrubbing, goLive }: Props) {
  // Keyboard shortcut: Esc returns to live
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isScrubbing) goLive();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isScrubbing, goLive]);

  if (!scrubRange) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">Time travel</h2>
            <p className="mt-1 text-xs text-neutral-500">Building history buffer... drag the slider to rewind once data accumulates.</p>
          </div>
          <span className="text-xs font-mono text-neutral-400">no history yet</span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-neutral-100" />
      </div>
    );
  }

  const min = scrubRange.min;
  const max = scrubRange.max;
  const value = scrubTs ?? max;
  const isLive = !isScrubbing;
  const minutesBack = isLive ? 0 : Math.round((max - value) / 60000);
  const secondsBack = isLive ? 0 : Math.round((max - value) / 1000);

  return (
    <div
      className={`rounded-xl border p-4 sm:p-6 shadow-sm transition-colors ${
        isScrubbing ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-700">Time travel</h2>
            {isScrubbing && (
              <span className="rounded bg-amber-200 text-amber-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Viewing past
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-600">
            {isLive
              ? "Drag the slider to rewind the vol surface up to 30 min."
              : minutesBack > 0
              ? `Rewound ${minutesBack} min — vol smile and vault frozen at that moment. Press Esc to return live.`
              : `Rewound ${secondsBack}s. Press Esc to return live.`}
          </p>
        </div>
        <button
          onClick={goLive}
          disabled={isLive}
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
            isLive
              ? "bg-emerald-100 text-emerald-700 cursor-default"
              : "bg-indigo-600 text-white hover:bg-indigo-500"
          }`}
        >
          {isLive ? "● Live" : "Return live"}
        </button>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1000}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (v >= max - 1000) setScrubTs(null);
          else setScrubTs(v);
        }}
        className="mt-4 w-full accent-indigo-600"
      />
      <div className="mt-2 flex justify-between text-xs font-mono text-neutral-500">
        <span>{new Date(min).toLocaleTimeString()}</span>
        <span className="font-semibold text-neutral-900">
          {new Date(value).toLocaleTimeString()}
        </span>
        <span>now</span>
      </div>
    </div>
  );
}