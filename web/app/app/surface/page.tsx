"use client";

import { useEffect, useMemo, useState } from "react";
import { useVolStreamContext } from "../../lib/VolStreamContext";
import { TimeTravel } from "../../components/TimeTravel";
import { SmileChart } from "../../components/SmileChart";
import { OracleList } from "../../components/OracleList";
import { ArbCheck } from "../../components/ArbCheck";
import { TermStructureChart } from "../../components/TermStructureChart";
import { SkewChart } from "../../components/SkewChart";
import { VolSurface3D } from "../../components/VolSurface3D";
import { atmIV } from "../../lib/svi";
import { classifySmile } from "../../lib/classifySmile";
import { formatTime } from "../../lib/format";

export default function SurfacePage() {
  const { oracles, scrubTs, setScrubTs, scrubRange, isScrubbing, goLive, status, recent } = useVolStreamContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const current = selectedId ? oracles[selectedId] : null;
    const stillValid =
      current &&
      current.svi &&
      current.forward &&
      current.expiryMs &&
      (current.expiryMs as number) > Date.now();
    if (!stillValid) {
      const candidates = Object.values(oracles).filter(
        (o) => o.svi && o.forward && o.expiryMs && o.expiryMs > Date.now(),
      );
      if (candidates.length > 0) {
        candidates.sort((a, b) => (a.expiryMs ?? 0) - (b.expiryMs ?? 0));
        setSelectedId(candidates[0].oracleId);
      }
    }
  }, [oracles, selectedId]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return oracles[selectedId] ?? null;
  }, [oracles, selectedId]);

  const selectedShape = useMemo(() => {
    if (!selected || !selected.svi) return null;
    return classifySmile(selected.svi);
  }, [selected]);

  const activeWithSvi = Object.values(oracles).filter((o) => o.svi && o.forward && o.expiryMs && o.expiryMs > now);
  const expiryCount = activeWithSvi.length;

  const nearestOracle = [...activeWithSvi].sort((a, b) => (a.expiryMs ?? 0) - (b.expiryMs ?? 0))[0];
  const nearestAtm = nearestOracle && nearestOracle.svi ? atmIV(nearestOracle.svi) : null;

  const lastTickTs = recent.length > 0 ? recent[0].ts : null;

  return (
    <main className="px-3 sm:px-5 py-3 sm:py-4">
      <div className="mx-auto max-w-[1600px]">
        {/* Status strip */}
        <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto whitespace-nowrap border border-neutral-800 bg-neutral-900/60 rounded px-3 sm:px-4 py-2 font-mono text-[11px] sm:text-xs">
          <span className="text-blue-400 font-bold">/ VOL SURFACE</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">DeepBook Predict</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">Sui Testnet</span>
          <span className="text-neutral-600">·</span>
          <span className={status === "open" ? "text-emerald-400" : "text-amber-400"}>
            {status === "open" ? "● LIVE" : status === "connecting" ? "○ CONNECTING" : "○ OFFLINE"}
          </span>
          {isScrubbing && (
            <>
              <span className="text-neutral-600">·</span>
              <span className="text-amber-400 font-bold">⏪ REPLAY</span>
            </>
          )}
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            LAST <span className="text-white">{lastTickTs ? formatTime(lastTickTs) : "—"}</span>
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            EXPIRIES <span className="text-white">{expiryCount}</span>
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            NEAREST ATM <span className="text-white">{nearestAtm !== null ? `${(nearestAtm * 100).toFixed(1)}%` : "—"}</span>
          </span>
        </div>

        {/* Time travel */}
        <div className="mt-3">
          <TimeTravel
            scrubTs={scrubTs}
            setScrubTs={setScrubTs}
            scrubRange={scrubRange}
            isScrubbing={isScrubbing}
            goLive={goLive}
          />
        </div>

        {/* Main grid: 3D surface (left, 8 cols) + term/skew stacked (right, 4 cols) */}
        <div className="mt-3 grid grid-cols-12 gap-3">
         <section className="col-span-12 lg:col-span-8 rounded border border-neutral-800 bg-neutral-900 min-h-[520px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">3D VOL SURFACE</span>
              <span className="font-mono text-[10px] text-neutral-600">strike × expiry → IV (thermal)</span>
            </div>
            <div className="h-[480px]">
              <VolSurface3D oracles={oracles} now={now} />
            </div>
          </section>

          <aside className="col-span-12 lg:col-span-4 flex flex-col gap-3">
            <section className="rounded border border-neutral-800 bg-neutral-900">
              <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">TERM STRUCTURE</span>
                <span className="font-mono text-[10px] text-neutral-600">ATM IV vs expiry</span>
              </div>
              <TermStructureChart oracles={oracles} now={now} height={230} />
            </section>

            <section className="rounded border border-neutral-800 bg-neutral-900">
              <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">SKEW CURVE</span>
                <span className="font-mono text-[10px] text-neutral-600">IV vs log-moneyness · nearest exp</span>
              </div>
              <SkewChart oracles={oracles} now={now} height={230} />
            </section>
          </aside>
        </div>

        {/* Arb check */}
        <section className="mt-3 rounded border border-neutral-800 bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">ARBITRAGE CHECK</span>
            <span className="font-mono text-[10px] text-neutral-600">Gatheral butterfly · calendar monotonicity</span>
          </div>
          <div className="p-3 sm:p-4">
            <ArbCheck oracles={oracles} />
          </div>
        </section>

        {/* Oracle list + Expiry deep-dive */}
        <div className="mt-3 grid grid-cols-12 gap-3">
          <section className="col-span-12 lg:col-span-4 rounded border border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">ORACLES</span>
              <span className="font-mono text-[10px] text-neutral-600">{Object.keys(oracles).length} total</span>
            </div>
            <div className="p-2">
              <OracleList oracles={oracles} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </section>

          <section className="col-span-12 lg:col-span-8 rounded border border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">EXPIRY DEEP-DIVE</span>
                {selectedShape && (
                  <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest font-bold ${
                    selectedShape.tone === "red" ? "border-red-800 bg-red-950 text-red-300" :
                    selectedShape.tone === "emerald" ? "border-emerald-800 bg-emerald-950 text-emerald-300" :
                    selectedShape.tone === "amber" ? "border-amber-800 bg-amber-950 text-amber-300" :
                    "border-blue-800 bg-blue-950 text-blue-300"
                  }`}>
                    {selectedShape.label}{selectedShape.variant ? ` · ${selectedShape.variant}` : ""}
                  </span>
                )}
              </div>
              <span className="font-mono text-[10px] text-neutral-600 truncate shrink-0">
                {selected ? `oracle ${selected.oracleId.slice(0, 8)}…` : "no oracle selected"}
              </span>
            </div>
            <div className="p-3 sm:p-4">
              {selected ? (
                <>
                  <SmileChart oracle={selected} />
                  {selectedShape && (
                    <p className="mt-3 font-mono text-[11px] text-neutral-400">{selectedShape.description}</p>
                  )}
                </>
              ) : (
                <div className="flex h-64 items-center justify-center text-center text-sm text-neutral-500">
                  Select an oracle from the list →
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PlaceholderSlot({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-1 p-6 text-center">
      <span className="font-mono text-xs text-neutral-500">{label}</span>
      <span className="font-mono text-[10px] text-neutral-600">{sub}</span>
    </div>
  );
}