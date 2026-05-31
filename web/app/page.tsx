"use client";

import { useVolStream } from "./lib/useVolStream";
import { formatTime, formatUSD, shortId } from "./lib/format";
import { SpotSparkline } from "./components/SpotSparkline";

export default function Home() {
  const { status, recent, latestSpot, oracleCount, spotHistory } =
    useVolStream();

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-neutral-200">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-neutral-900 pb-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-semibold tracking-tight text-amber-400">
            VolWatch
          </span>
          <span className="text-xs uppercase tracking-widest text-neutral-600">
            DeepBook Predict · testnet
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              status === "open"
                ? "bg-emerald-500 animate-pulse"
                : status === "connecting"
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
          />
          <span className="text-neutral-400">
            {status === "open"
              ? "Live"
              : status === "connecting"
              ? "Connecting…"
              : "Disconnected"}
          </span>
        </div>
      </header>

      {/* Top row: BTC spot (with sparkline) + small stats */}
      <section className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Spot card spans 2 columns, contains the chart */}
        <div className="lg:col-span-2 rounded-lg border border-neutral-900 bg-neutral-950 p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-neutral-500">
                BTC spot
              </p>
              <p className="mt-2 font-mono text-3xl font-semibold text-neutral-100">
                {latestSpot !== null ? formatUSD(latestSpot) : "—"}
              </p>
            </div>
            <p className="text-xs text-neutral-600">
              last {spotHistory.length} ticks
            </p>
          </div>
          <div className="mt-4">
            <SpotSparkline data={spotHistory} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Stat label="Active oracles" value={String(oracleCount)} />
          <Stat label="Events in buffer" value={String(recent.length)} />
        </div>
      </section>

      {/* Live tape */}
      <section className="mx-auto mt-6 max-w-6xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Live event tape
          </h2>
          <span className="text-xs text-neutral-600">
            Newest first · last {recent.length}
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-neutral-900 bg-neutral-950">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-600">
              Waiting for events…
            </div>
          ) : (
            <ul className="divide-y divide-neutral-900 font-mono text-xs">
              {recent.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-900/50"
                >
                  <span className="w-20 text-neutral-600">
                    {formatTime(e.ts)}
                  </span>
                  <EventBadge kind={e.kind} />
                  <span className="text-neutral-500">
                    {shortId(e.oracleId)}
                  </span>
                  <span className="ml-auto text-neutral-200">
                    {renderDetail(e)}
                  </span>
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
    <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-4">
      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold text-neutral-100">
        {value}
      </p>
    </div>
  );
}

function EventBadge({ kind }: { kind: string }) {
  const styles: Record<string, string> = {
    prices: "bg-sky-950 text-sky-400 border-sky-900/60",
    svi: "bg-amber-950 text-amber-400 border-amber-900/60",
    activated: "bg-emerald-950 text-emerald-400 border-emerald-900/60",
    settled: "bg-neutral-800 text-neutral-400 border-neutral-700",
  };
  return (
    <span
      className={`w-20 rounded border px-1.5 py-0.5 text-center text-[10px] uppercase tracking-wider ${
        styles[kind] ?? styles.settled
      }`}
    >
      {kind}
    </span>
  );
}

function renderDetail(e: ReturnType<typeof useVolStream>["recent"][number]) {
  if (e.kind === "prices") {
    return (
      <span>
        spot <span className="text-amber-400">{formatUSD(e.spot)}</span>
      </span>
    );
  }
  if (e.kind === "svi") {
    return (
      <span className="text-neutral-500">
        a={e.a} b={e.b} σ={e.sigma}
      </span>
    );
  }
  if (e.kind === "activated") {
    return (
      <span className="text-emerald-400">
        expiry {new Date(e.expiryMs).toLocaleTimeString()}
      </span>
    );
  }
  if (e.kind === "settled") {
    return (
      <span className="text-neutral-400">
        settled {formatUSD(e.settlementPrice)}
      </span>
    );
  }
  return null;
}
