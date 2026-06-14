"use client";

import { useEffect, useState } from "react";
import { useVolStreamContext } from "../../lib/VolStreamContext";
import { SkewChart } from "../../components/SkewChart";

export default function SkewEmbed() {
  const { oracles, status } = useVolStreamContext();
  const [liveNow, setLiveNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setLiveNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 p-2">
      <div className="rounded border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="border-b border-neutral-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-neutral-300 font-bold">SKEW · NEAREST EXPIRY</span>
            <span className="text-neutral-700">·</span>
            <span className={`font-mono text-xs font-bold ${status === "open" ? "text-emerald-400" : "text-amber-400"}`}>
              {status === "open" ? "● LIVE" : status === "connecting" ? "○ CONNECTING" : "○ OFFLINE"}
            </span>
          </div>

         <a 
            href="https://volwatch.vercel.app"
            target="_blank"
            rel="noopener"
            className="font-mono text-xs text-neutral-400 hover:text-blue-400 transition-colors"
          >
            vwatch ↗
          </a>
        </div>
        <SkewChart oracles={oracles} now={liveNow} height={300} />
      </div>
    </main>
  );
}