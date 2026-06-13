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
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isScrubbing) goLive();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isScrubbing, goLive]);

  if (!scrubRange) {
    return (
      <section className="rounded border border-neutral-800 bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-300">TIME TRAVEL</span>
          <span className="font-mono text-xs text-neutral-400">building history buffer…</span>
        </div>
        <div className="px-4 py-5">
          <div className="h-1.5 rounded-full bg-neutral-800" />
          <p className="mt-3 font-mono text-xs text-neutral-400">Drag the slider once history accumulates to rewind up to 30 min.</p>
        </div>
      </section>
    );
  }

  const min = scrubRange.min;
  const max = scrubRange.max;
  const value = scrubTs ?? max;
  const isLive = !isScrubbing;
  const minutesBack = isLive ? 0 : Math.round((max - value) / 60000);
  const secondsBack = isLive ? 0 : Math.round((max - value) / 1000);

  // Compute slider progress (0..1) for the colored track
  const progress = (value - min) / Math.max(1, max - min);

  return (
    <section
      className={`rounded border transition-colors ${
        isScrubbing
          ? "border-amber-500/40 bg-neutral-900"
          : "border-neutral-800 bg-neutral-900"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-widest text-neutral-300">TIME TRAVEL</span>
          {isScrubbing && (
            <span className="font-mono text-xs uppercase tracking-widest font-bold rounded border border-amber-500/40 bg-amber-950/60 text-amber-300 px-2 py-0.5">
              ⏪ HISTORICAL
            </span>
          )}
        </div>
        <button
          onClick={goLive}
          disabled={isLive}
          className={`rounded border px-3 py-1 font-mono text-xs uppercase tracking-widest font-bold transition-colors ${
            isLive
              ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300 cursor-default"
              : "border-blue-500 bg-blue-950/50 text-blue-300 hover:bg-blue-900/60"
          }`}
        >
          {isLive ? "● LIVE" : "RETURN TO LIVE"}
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        <p className="font-mono text-xs text-neutral-300">
          {isLive
            ? "Drag the slider to rewind the vol surface up to 30 minutes."
            : minutesBack > 0
              ? `Rewound ${minutesBack}m — vol surface and vault frozen at that moment. Press Esc to return live.`
              : `Rewound ${secondsBack}s — Press Esc to return live.`}
        </p>

        {/* Slider with custom styling */}
        <div className="mt-4 relative">
          {/* Track background */}
          <div className="absolute top-1/2 -translate-y-1/2 h-1.5 w-full rounded-full bg-neutral-800 pointer-events-none" />
          {/* Filled portion */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full pointer-events-none transition-colors ${
              isScrubbing ? "bg-amber-500" : "bg-blue-500"
            }`}
            style={{ width: `${progress * 100}%` }}
          />
          {/* Actual range input — transparent track, just the thumb */}
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
            className="relative w-full h-4 appearance-none bg-transparent cursor-pointer time-travel-slider"
          />
        </div>

        {/* Labels under slider */}
        <div className="mt-3 flex justify-between font-mono text-xs">
          <div className="flex flex-col items-start">
            <span className="text-neutral-300">30m ago</span>
            <span className="text-neutral-200 text-xs mt-0.5">{new Date(min).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className={`font-bold ${isScrubbing ? "text-amber-300" : "text-white"}`}>
              {new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span className="text-neutral-200 text-xs mt-0.5">
              {isLive ? "live" : minutesBack > 0 ? `−${minutesBack}m` : `−${secondsBack}s`}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-neutral-300">now</span>
            <span className="text-neutral-200 text-xs mt-0.5">{new Date(max).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .time-travel-slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid ${isScrubbing ? "#f59e0b" : "#3b82f6"};
          cursor: pointer;
          box-shadow: 0 0 0 4px ${isScrubbing ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)"};
          transition: box-shadow 0.15s;
        }
        .time-travel-slider::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 6px ${isScrubbing ? "rgba(245, 158, 11, 0.25)" : "rgba(59, 130, 246, 0.25)"};
        }
        .time-travel-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid ${isScrubbing ? "#f59e0b" : "#3b82f6"};
          cursor: pointer;
          box-shadow: 0 0 0 4px ${isScrubbing ? "rgba(245, 158, 11, 0.15)" : "rgba(59, 130, 246, 0.15)"};
        }
        .time-travel-slider::-webkit-slider-runnable-track {
          background: transparent;
        }
        .time-travel-slider::-moz-range-track {
          background: transparent;
        }
      `}</style>
    </section>
  );
}