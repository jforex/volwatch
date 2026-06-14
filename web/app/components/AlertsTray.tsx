"use client";

import { useEffect, useRef, useState } from "react";
import { useVolStreamContext } from "../lib/VolStreamContext";
import type { SmileAlert } from "../lib/useSmileAlerts";

const TOAST_DURATION_MS = 6000;

export function AlertsTray() {
  const { alerts, clearAlerts, dismissAlert } = useVolStreamContext();
  const [trayOpen, setTrayOpen] = useState(false);
  const [toastQueue, setToastQueue] = useState<SmileAlert[]>([]);
  const shownIdsRef = useRef<Set<string>>(new Set());

  // Show toasts only for NEW alerts (not on initial mount)
  useEffect(() => {
    const newToasts: SmileAlert[] = [];
    for (const alert of alerts) {
      if (!shownIdsRef.current.has(alert.id)) {
        shownIdsRef.current.add(alert.id);
        newToasts.push(alert);
      }
    }
    if (newToasts.length > 0) {
      setToastQueue((q) => [...newToasts, ...q].slice(0, 4));
      // Auto-dismiss toasts after duration
      for (const t of newToasts) {
        setTimeout(() => {
          setToastQueue((q) => q.filter((x) => x.id !== t.id));
        }, TOAST_DURATION_MS);
      }
    }
  }, [alerts]);

  return (
    <>
      {/* Tray button (lives in nav) */}
      <button
        onClick={() => setTrayOpen((s) => !s)}
        className="relative rounded border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 hover:border-blue-500 transition-colors px-3 py-1.5 font-mono text-xs text-neutral-200"
        aria-label="Smile alerts"
        title="Smile shape change alerts"
      >
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${alerts.length > 0 ? "bg-amber-400 animate-pulse" : "bg-neutral-600"}`} />
          ALERTS
          {alerts.length > 0 && (
            <span className="ml-1 rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-xs font-bold">
              {alerts.length}
            </span>
          )}
        </span>
      </button>

      {/* Tray panel */}
      {trayOpen && (
        <>
          {/* Backdrop to close on click */}
          <div className="fixed inset-0 z-40" onClick={() => setTrayOpen(false)} />

          <div className="absolute right-3 sm:right-5 top-14 z-50 w-[min(90vw,420px)] rounded border border-neutral-800 bg-neutral-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-widest text-blue-400 font-bold">/ SMILE ALERTS</span>
                {alerts.length > 0 && (
                  <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 text-xs font-bold font-mono">
                    {alerts.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {alerts.length > 0 && (
                  <button
                    onClick={clearAlerts}
                    className="font-mono text-xs uppercase tracking-widest text-neutral-300 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setTrayOpen(false)}
                  className="text-neutral-300 hover:text-white text-sm leading-none"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="font-mono text-xs text-neutral-300">No alerts yet.</p>
                  <p className="mt-2 font-mono text-xs text-neutral-400 leading-relaxed">
                    When an oracle's smile shape changes — SMILE → SKEW, SKEW → SMIRK, etc. — it shows up here. Toasts also appear briefly when alerts fire.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-800">
                  {alerts.map((a) => (
                    <li key={a.id} className="px-4 py-3 hover:bg-neutral-900/60 group">
                      <div className="flex items-start gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full mt-2 shrink-0 ${toneToDot(a.toTone)}`} />
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs">
                            <span className="text-neutral-400">{a.fromLabel}</span>
                            {a.fromVariant && <span className="text-neutral-500"> · {a.fromVariant}</span>}
                            <span className="text-neutral-300 mx-1.5">→</span>
                            <span className={`font-bold ${toneToText(a.toTone)}`}>{a.toLabel}</span>
                            {a.toVariant && <span className={toneToText(a.toTone)}> · {a.toVariant}</span>}
                          </p>
                          <p className="mt-1 font-mono text-xs text-neutral-400">
                            <span className="text-neutral-300">{a.oracleId.slice(0, 8)}…{a.oracleId.slice(-4)}</span>
                            <span className="text-neutral-600 mx-1.5">·</span>
                            <span>exp in {a.minutesToExpiry < 60 ? `${a.minutesToExpiry}m` : `${(a.minutesToExpiry / 60).toFixed(1)}h`}</span>
                            <span className="text-neutral-600 mx-1.5">·</span>
                            <span>{relativeTime(a.ts)}</span>
                          </p>
                        </div>
                        <button
                          onClick={() => dismissAlert(a.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-white text-xs"
                          aria-label="Dismiss"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* Toast stack — bottom-right corner */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toastQueue.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto rounded border border-neutral-700 bg-neutral-950 shadow-2xl px-4 py-3 min-w-[280px] max-w-[400px] animate-toast"
          >
            <div className="flex items-start gap-3">
              <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${toneToDot(t.toTone)} animate-pulse`} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs uppercase tracking-widest text-blue-400 font-bold">/ SMILE CHANGED</p>
                <p className="mt-1 font-mono text-xs">
                  <span className="text-neutral-400">{t.fromLabel}</span>
                  <span className="text-neutral-300 mx-1.5">→</span>
                  <span className={`font-bold ${toneToText(t.toTone)}`}>{t.toLabel}</span>
                  {t.toVariant && <span className={toneToText(t.toTone)}> · {t.toVariant}</span>}
                </p>
                <p className="mt-1 font-mono text-xs text-neutral-400">
                  {t.oracleId.slice(0, 8)}…{t.oracleId.slice(-4)} · exp in {t.minutesToExpiry < 60 ? `${t.minutesToExpiry}m` : `${(t.minutesToExpiry / 60).toFixed(1)}h`}
                </p>
              </div>
              <button
                onClick={() => setToastQueue((q) => q.filter((x) => x.id !== t.id))}
                className="text-neutral-400 hover:text-white text-xs"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-toast {
          animation: toast-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

function toneToDot(tone: "neutral" | "red" | "emerald" | "amber"): string {
  switch (tone) {
    case "red": return "bg-red-500";
    case "emerald": return "bg-emerald-500";
    case "amber": return "bg-amber-500";
    default: return "bg-blue-500";
  }
}

function toneToText(tone: "neutral" | "red" | "emerald" | "amber"): string {
  switch (tone) {
    case "red": return "text-red-300";
    case "emerald": return "text-emerald-300";
    case "amber": return "text-amber-300";
    default: return "text-blue-300";
  }
}

function relativeTime(ts: number): string {
  const diff = Math.round((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}