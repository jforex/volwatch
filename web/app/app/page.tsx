"use client";

import { useEffect, useState } from "react";
import { useVolStreamContext } from "../lib/VolStreamContext";
import { formatTime, formatUSD, shortId } from "../lib/format";
import { SpotChart } from "../components/SpotChart";
import { atmIV } from "../lib/svi";
import { explainSurface } from "../lib/explainer";

export default function Home() {
  const { recent, latestSpot, oracleCount, spotHistory, oracles, vault, status } = useVolStreamContext();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Derive nearest ATM IV
  const nearestOracle = Object.values(oracles)
    .filter((o) => o.svi && o.forward && o.expiryMs && o.expiryMs > now)
    .sort((a, b) => (a.expiryMs ?? 0) - (b.expiryMs ?? 0))[0];

  const atm = nearestOracle && nearestOracle.svi ? atmIV(nearestOracle.svi) : null;

  const util = vault ? vault.utilizationPct : null;
  const high = spotHistory.length > 0 ? Math.max(...spotHistory.map((d) => d.spot)) : null;
  const low = spotHistory.length > 0 ? Math.min(...spotHistory.map((d) => d.spot)) : null;
  const avg = spotHistory.length > 0 ? spotHistory.reduce((s, d) => s + d.spot, 0) / spotHistory.length : null;
  const delta = spotHistory.length > 1 ? ((spotHistory[spotHistory.length - 1].spot - spotHistory[0].spot) / spotHistory[0].spot) * 100 : null;
  const lastTickTs = recent.length > 0 ? recent[0].ts : null;

  return (
    <main className="px-3 sm:px-5 py-3 sm:py-4">
      <div className="mx-auto max-w-[1600px]">
        {/* Status strip */}
        <div className="flex items-center gap-3 sm:gap-5 overflow-x-auto whitespace-nowrap border border-neutral-800 bg-neutral-900/60 rounded px-3 sm:px-4 py-2 font-mono text-[11px] sm:text-xs">
          <span className="text-blue-400 font-bold">/ HOME</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">DeepBook Predict</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">Sui Testnet</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">BTC-USD</span>
          <span className="text-neutral-600">·</span>
          <span className={status === "open" ? "text-emerald-400" : "text-amber-400"}>
            {status === "open" ? "● LIVE" : status === "connecting" ? "○ CONNECTING" : "○ OFFLINE"}
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            LAST <span className="text-white">{lastTickTs ? formatTime(lastTickTs) : "—"}</span>
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            ORACLES <span className="text-white">{oracleCount}</span>
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            ATM <span className="text-white">{atm !== null ? `${(atm * 100).toFixed(1)}%` : "—"}</span>
          </span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400">
            UTIL <span className="text-white">{util !== null ? `${util.toFixed(1)}%` : "—"}</span>
          </span>
        </div>

        {/* Main grid */}
        <InsightsPanel oracles={oracles} vault={vault} latestSpot={latestSpot} />

        {/* Main grid */}
        <div className="mt-3 grid grid-cols-12 gap-3">
          {/* BTC chart panel — 8 cols */}
          <section className="col-span-12 lg:col-span-8 rounded border border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">BTC SPOT</span>
                <span className="font-mono text-xs text-neutral-600">{spotHistory.length} ticks</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-lg sm:text-2xl font-bold text-white">
                  {latestSpot !== null ? formatUSD(latestSpot) : "—"}
                </span>
                {delta !== null && (
                  <span className={`font-mono text-xs sm:text-sm font-semibold ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {delta >= 0 ? "▲" : "▼"} {delta >= 0 ? "+" : ""}{delta.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 sm:p-3">
              <SpotChart data={spotHistory} height={360} />
            </div>
            <div className="grid grid-cols-4 border-t border-neutral-800 divide-x divide-neutral-800">
              <DenseCell label="HIGH" value={high !== null ? formatUSD(high) : "—"} />
              <DenseCell label="LOW" value={low !== null ? formatUSD(low) : "—"} />
              <DenseCell label="AVG" value={avg !== null ? formatUSD(avg) : "—"} />
              <DenseCell label="TICKS" value={String(spotHistory.length)} />
            </div>
          </section>

          {/* Right rail — 4 cols */}
          <aside className="col-span-12 lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-3">
            <DensePanel
              label="ORACLES"
              value={String(oracleCount)}
              sub={`${Object.values(oracles).filter((o) => o.svi).length} with SVI`}
            />
            <DensePanel
              label="ATM IV"
              value={atm !== null ? `${(atm * 100).toFixed(1)}%` : "—"}
              sub={nearestOracle ? `nearest exp ${new Date(nearestOracle.expiryMs!).toLocaleTimeString()}` : "no active oracle"}
            />
            <DensePanel
              label="VAULT UTIL"
              value={util !== null ? `${util.toFixed(1)}%` : "—"}
              sub={vault ? `${formatUSD(vault.vaultBalance)} balance` : "—"}
              accent={util !== null ? (util > 90 ? "red" : util > 75 ? "amber" : "emerald") : undefined}
            />
            <DensePanel
              label="EVENTS"
              value={String(recent.length)}
              sub="in buffer"
            />
          </aside>
        </div>

        {/* Event tape — full width */}
        <section className="mt-3 rounded border border-neutral-800 bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">EVENT TAPE</span>
            <span className="font-mono text-xs text-neutral-600">latest 10</span>
          </div>
          {recent.length === 0 ? (
            <div className="p-6 text-center font-mono text-xs text-neutral-500">Waiting for events…</div>
          ) : (
            <ul className="font-mono text-[11px] sm:text-xs">
              {recent.slice(0, 10).map((e, i) => (
                <li key={i} className="flex items-center gap-3 sm:gap-4 border-b border-neutral-800/60 last:border-b-0 px-4 py-1.5 hover:bg-neutral-800/40">
                  <span className="w-16 text-neutral-500 shrink-0 hidden sm:inline">{formatTime(e.ts)}</span>
                  <EventBadge kind={e.kind} />
                  <span className="text-neutral-500 truncate min-w-0">{shortId(e.oracleId)}</span>
                  <span className="ml-auto text-white shrink-0">{renderDetail(e)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function DenseCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 sm:px-4 py-2 sm:py-3">
      <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{label}</p>
      <p className="mt-0.5 font-mono text-sm sm:text-base font-bold text-white">{value}</p>
    </div>
  );
}

function DensePanel({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "emerald" | "amber" | "red" }) {
  const accentClass =
    accent === "red" ? "text-red-400"
    : accent === "amber" ? "text-amber-400"
    : accent === "emerald" ? "text-emerald-400"
    : "text-white";
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900 px-3 sm:px-4 py-2 sm:py-3">
      <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest text-neutral-500 font-bold">{label}</p>
      <p className={`mt-1 font-mono text-lg sm:text-xl font-bold ${accentClass}`}>{value}</p>
      {sub && <p className="mt-0.5 font-mono text-[10px] text-neutral-600 truncate">{sub}</p>}
    </div>
  );
}

function EventBadge({ kind }: { kind: string }) {
  const styles: Record<string, string> = {
    prices: "bg-sky-950 text-sky-300 border-sky-800",
    svi: "bg-blue-950 text-blue-300 border-blue-800",
    activated: "bg-emerald-950 text-emerald-300 border-emerald-800",
    settled: "bg-neutral-800 text-neutral-300 border-neutral-700",
  };
  return (
    <span className={`w-14 sm:w-16 rounded border px-1 py-0.5 text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0 ${styles[kind] ?? styles.settled}`}>
      {kind}
    </span>
  );
}

function renderDetail(e: { kind: string; spot?: number; a?: string; expiryMs?: number; settlementPrice?: number }) {
  if (e.kind === "prices" && e.spot !== undefined) {
    return <span>spot <span className="text-blue-400">{formatUSD(e.spot)}</span></span>;
  }
  if (e.kind === "svi" && e.a !== undefined) {
    return <span className="text-neutral-400 truncate">a={e.a}</span>;
  }
  if (e.kind === "activated" && e.expiryMs !== undefined) {
    return <span className="text-emerald-400">exp {new Date(e.expiryMs).toLocaleTimeString()}</span>;
  }
  if (e.kind === "settled" && e.settlementPrice !== undefined) {
    return <span className="text-neutral-300">settled {formatUSD(e.settlementPrice)}</span>;
  }
  return null;
}
function InsightsPanel({
  oracles,
  vault,
  latestSpot,
}: {
  oracles: ReturnType<typeof useVolStreamContext>["oracles"];
  vault: ReturnType<typeof useVolStreamContext>["vault"];
  latestSpot: ReturnType<typeof useVolStreamContext>["latestSpot"];
}) {
  const observations = explainSurface(oracles, vault, latestSpot);

  // Pick top 3 most important: alerts > warnings > notable > info
  const priority = { alert: 4, warning: 3, notable: 2, info: 1 } as const;
  const top = [...observations]
    .sort((a, b) => priority[b.severity] - priority[a.severity])
    .slice(0, 3);

  if (top.length === 0) {
    return (
      <div className="mt-3 rounded border border-neutral-800 bg-neutral-900/40 px-4 py-3">
        <p className="font-mono text-[11px] text-neutral-500">Quiet surface — nothing notable to flag yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded border border-neutral-800 bg-neutral-900/40">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">/ READ-OUT</span>
        <span className="font-mono text-[10px] text-neutral-600">{observations.length} signal{observations.length === 1 ? "" : "s"} · plain English</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
        {top.map((o, i) => (
          <InsightCell key={i} obs={o} />
        ))}
      </div>
    </div>
  );
}

function InsightCell({ obs }: { obs: { severity: "info" | "notable" | "warning" | "alert"; title: string; detail: string } }) {
  const tone =
    obs.severity === "alert" ? { dot: "bg-red-500", label: "text-red-400" } :
    obs.severity === "warning" ? { dot: "bg-amber-500", label: "text-amber-400" } :
    obs.severity === "notable" ? { dot: "bg-blue-500", label: "text-blue-400" } :
    { dot: "bg-neutral-500", label: "text-neutral-400" };
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
        <span className={`font-mono text-[9px] uppercase tracking-widest font-bold ${tone.label}`}>
          {obs.severity}
        </span>
      </div>
      <p className="mt-1.5 font-semibold text-sm text-white leading-snug">{obs.title}</p>
      <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{obs.detail}</p>
    </div>
  );
}