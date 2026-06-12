"use client";

import { useVolStreamContext } from "../../lib/VolStreamContext";
import { TimeTravel } from "../../components/TimeTravel";
import { PLPDashboard } from "../../components/PLPDashboard";

export default function PLPPage() {
  const { vault, scrubTs, setScrubTs, scrubRange, isScrubbing, goLive } = useVolStreamContext();

  return (
    <main className="px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-400">/ PLP</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            PLP vault risk
          </h1>
          <p className="mt-2 text-base text-neutral-400">Live vault state read directly from the Predict object on Sui testnet.</p>
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
          <PLPDashboard vault={vault} />
        </section>

        <p className="mt-8 text-xs text-neutral-500 italic">
          Phase 6: NAV-over-time chart, Expected Yield calculation, and on-demand AI Summary will be added here.
        </p>
      </div>
    </main>
  );
}
