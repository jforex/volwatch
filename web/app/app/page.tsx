"use client";

import { TimeTravel } from "../components/TimeTravel";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useVolStream, OracleState } from "../lib/useVolStream";
import { formatTime, formatUSD, shortId } from "../lib/format";
import { SpotSparkline } from "../components/SpotSparkline";
import { SmileChart } from "../components/SmileChart";
import { OracleList } from "../components/OracleList";
import { PLPDashboard } from "../components/PLPDashboard";
import { ArbCheck } from "../components/ArbCheck";
import { SurfaceExplainer } from "../components/SurfaceExplainer";
import { VitalsStrip } from "../components/VitalsStrip";

function nearestActiveOracle(oracles: Record<string, OracleState>): OracleState | null {
  const candidates = Object.values(oracles).filter(
    (o) => o.svi && o.forward && o.expiryMs && o.expiryMs > Date.now(),
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (a.expiryMs ?? 0) - (b.expiryMs ?? 0));
  return candidates[0];
}

export default function Home() {
  const { status, recent, latestSpot, oracleCount, spotHistory, oracles, vault, scrubTs, setScrubTs, scrubRange, isScrubbing, goLive } = useVolStream();
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
    <main className="min-h-screen bg-neutral-50 px-4 py-5 sm:px-6 sm:py-8 text-neutral-900">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b border-neutral-200 pb-4">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Image src="/logo.png" alt="VWATCH" width={32} height={32} className="object-contain shrink-0 sm:h-9 sm:w-9 rounded" />
            <span className="font-[family-name:var(--font-space-grotesk)] text-lg sm:text-xl font-bold tracking-tight">VWATCH</span>
          <span className="hidden md:inline text-sm uppercase tracking-widest text-neutral-500 font-semibold truncate">DeepBook Predict · testnet</span>
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold shrink-0">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${
            status === "open" ? "bg-emerald-500 animate-pulse"
            : status === "connecting" ? "bg-amber-500"
            : "bg-red-500"
          }`} />
          <span className="text-neutral-700">
            {status === "open" ? "Live" : status === "connecting" ? "Connecting…" : "Disconnected"}
          </span>
        </div>
      </header>

      <section className="mx-auto mt-5 sm:mt-6 max-w-7xl">
        <TimeTravel
          scrubTs={scrubTs}
          setScrubTs={setScrubTs}
          scrubRange={scrubRange}
          isScrubbing={isScrubbing}
          goLive={goLive}
        />
      </section>

      <section className="mx-auto mt-5 sm:mt-6 max-w-7xl">
        <VitalsStrip oracles={oracles} vault={vault} />
      </section>

      <section className="mx-auto mt-5 sm:mt-6 grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm uppercase tracking-wider text-neutral-500 font-semibold">BTC spot</p>
              <p className="mt-1 sm:mt-2 font-mono text-2xl sm:text-4xl font-bold text-neutral-900">
                {latestSpot !== null ? formatUSD(latestSpot) : "—"}
              </p>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 text-right">last {spotHistory.length} ticks</p>
          </div>
          <div className="mt-4">
            <SpotSparkline data={spotHistory} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:flex lg:flex-col">
          <Stat label="Active oracles" value={String(oracleCount)} />
          <Stat label="Events in buffer" value={String(recent.length)} />
        </div>
      </section>

      <section className="mx-auto mt-5 sm:mt-6 max-w-7xl">
        <PLPDashboard vault={vault} />
      </section>

      <section className="mx-auto mt-5 sm:mt-6 max-w-7xl">
        <ArbCheck oracles={oracles} />
      </section>

      <section className="mx-auto mt-5 sm:mt-6 max-w-7xl">
        <SurfaceExplainer oracles={oracles} vault={vault} latestSpot={latestSpot} />
      </section>

      <section className="mx-auto mt-5 sm:mt-6 grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <OracleList oracles={oracles} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
        <div className="lg:col-span-2">
          {selected ? (
            <SmileChart oracle={selected} />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm sm:text-base text-neutral-500 shadow-sm">
              Select an oracle from the list →
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto mt-5 sm:mt-6 max-w-7xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-neutral-700">Live event tape</h2>
          <span className="text-xs sm:text-sm text-neutral-500">Newest · last {recent.length}</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm sm:text-base text-neutral-500">Waiting for events…</div>
          ) : (
            <ul className="divide-y divide-neutral-200 font-mono text-xs sm:text-sm">
              {recent.slice(0, 30).map((e, i) => (
                <li key={i} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-neutral-50">
                  <span className="hidden sm:inline w-20 text-neutral-500 shrink-0">{formatTime(e.ts)}</span>
                  <EventBadge kind={e.kind} />
                  <span className="text-neutral-600 truncate min-w-0">{shortId(e.oracleId)}</span>
                  <span className="ml-auto text-neutral-900 font-semibold shrink-0 text-right">{renderDetail(e)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm">
      <p className="text-xs sm:text-sm uppercase tracking-wider text-neutral-500 font-semibold">{label}</p>
      <p className="mt-1 sm:mt-2 font-mono text-xl sm:text-3xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function EventBadge({ kind }: { kind: string }) {
  const styles: Record<string, string> = {
    prices: "bg-sky-50 text-sky-700 border-sky-200",
    svi: "bg-blue-50 text-blue-700 border-blue-200",
    activated: "bg-emerald-50 text-emerald-700 border-emerald-200",
    settled: "bg-neutral-100 text-neutral-700 border-neutral-300",
  };
  return (
    <span className={`w-16 sm:w-20 rounded border px-1.5 py-0.5 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shrink-0 ${styles[kind] ?? styles.settled}`}>
      {kind}
    </span>
  );
}

function renderDetail(e: ReturnType<typeof useVolStream>["recent"][number]) {
  if (e.kind === "prices") {
    return <span className="text-xs sm:text-sm">spot <span className="text-blue-700">{formatUSD(e.spot)}</span></span>;
  }
  if (e.kind === "svi") {
    return <span className="text-xs sm:text-sm text-neutral-500 truncate">a={e.a}</span>;
  }
  if (e.kind === "activated") {
    return <span className="text-xs sm:text-sm text-emerald-700">expiry {new Date(e.expiryMs).toLocaleTimeString()}</span>;
  }
  if (e.kind === "settled") {
    return <span className="text-xs sm:text-sm text-neutral-700">settled {formatUSD(e.settlementPrice)}</span>;
  }
  return null;
}