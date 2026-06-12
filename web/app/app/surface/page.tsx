"use client";

import { useEffect, useMemo, useState } from "react";
import { useVolStreamContext } from "../../lib/VolStreamContext";
import { TimeTravel } from "../../components/TimeTravel";
import { SmileChart } from "../../components/SmileChart";
import { OracleList } from "../../components/OracleList";
import { ArbCheck } from "../../components/ArbCheck";
import { SurfaceExplainer } from "../../components/SurfaceExplainer";

export default function SurfacePage() {
  const { oracles, vault, latestSpot, scrubTs, setScrubTs, scrubRange, isScrubbing, goLive } = useVolStreamContext();
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-400">/ VOL SURFACE</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Volatility surface
          </h1>
          <p className="mt-2 text-base text-neutral-400">Live smile curves, arbitrage checks, surface analysis.</p>
        </div>

        <section className="mt-5 sm:mt-6">
          <TimeTravel
            scrubTs={scrubTs}
            setScrubTs={setScrubTs}
            scrubRange={scrubRange}
            isScrubbing={isScrubbing}
            goLive={goLive}
          />
        </section>

        <section className="mt-5 sm:mt-6">
          <ArbCheck oracles={oracles} />
        </section>

        <section className="mt-5 sm:mt-6">
          <SurfaceExplainer oracles={oracles} vault={vault} latestSpot={latestSpot} />
        </section>

        <section className="mt-5 sm:mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <OracleList oracles={oracles} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="lg:col-span-2">
            {selected ? (
              <SmileChart oracle={selected} />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center text-sm sm:text-base text-neutral-500">
                Select an oracle from the list →
              </div>
            )}
          </div>
        </section>

        <p className="mt-8 text-xs text-neutral-500 italic">
          Phase 5: 3D vol surface, term structure curve, and skew curve will be added here.
        </p>
      </div>
    </main>
  );
}
