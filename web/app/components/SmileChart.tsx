"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from "recharts";
import { OracleState } from "../lib/useVolStream";
import { smileCurve } from "../lib/svi";
import { formatUSD, shortId } from "../lib/format";

export function SmileChart({ oracle }: { oracle: OracleState }) {
  if (!oracle.svi || !oracle.forward || !oracle.expiryMs) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500 shadow-sm">
        Waiting for SVI + forward + expiry…
      </div>
    );
  }

  if (oracle.expiryMs <= Date.now()) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500 shadow-sm">
        Oracle expired
      </div>
    );
  }

  const curve = smileCurve(oracle.svi, oracle.forward, { widthPct: 0.25 });
  const expiryDate = new Date(oracle.expiryMs);
  const minsToExpiry = Math.round((oracle.expiryMs - Date.now()) / 60000);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <p className="text-sm uppercase tracking-wider text-neutral-500 font-semibold">Vol smile</p>
          <p className="mt-1 font-mono text-base text-neutral-700">{shortId(oracle.oracleId)}</p>
        </div>
        <div className="text-right text-sm text-neutral-600">
          <p>Forward <span className="font-mono font-bold text-neutral-900">{formatUSD(oracle.forward)}</span></p>
          <p className="mt-0.5">Expires in <span className="font-mono font-bold text-indigo-600">{minsToExpiry}m</span> · <span className="font-mono">{expiryDate.toLocaleTimeString()}</span></p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#f5f5f5" vertical={false} />
            <XAxis dataKey="strike" tick={{ fontSize: 12, fill: "#525252", fontFamily: "monospace" }} tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} stroke="#e5e5e5" />
            <YAxis tick={{ fontSize: 12, fill: "#525252", fontFamily: "monospace" }} tickFormatter={(v) => `${Number(v).toFixed(0)}%`} stroke="#e5e5e5" width={48} />
            <Tooltip
              contentStyle={{ background: "#ffffff", border: "1px solid #e5e5e5", borderRadius: 8, fontSize: 13, fontFamily: "monospace", color: "#171717", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
              labelStyle={{ color: "#525252", fontWeight: 600 }}
              labelFormatter={(v) => `Strike ${formatUSD(Number(v))}`}
              formatter={(value: number) => [`${value.toFixed(2)}%`, "Implied vol"]}
            />
            <ReferenceLine x={oracle.forward} stroke="#4f46e5" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: "ATM", position: "top", fill: "#4f46e5", fontSize: 12, fontFamily: "monospace", fontWeight: "bold" }} />
            <Line type="monotone" dataKey="ivPct" stroke="#4f46e5" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2 border-t border-neutral-200 pt-4 font-mono text-xs">
        <ParamCell label="a" value={oracle.svi.a.toFixed(4)} />
        <ParamCell label="b" value={oracle.svi.b.toFixed(4)} />
        <ParamCell label="m" value={oracle.svi.m.toFixed(4)} />
        <ParamCell label="ρ" value={oracle.svi.rho.toFixed(3)} />
        <ParamCell label="σ" value={oracle.svi.sigma.toFixed(4)} />
      </div>
    </div>
  );
}

function ParamCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-neutral-500 font-semibold">{label}</p>
      <p className="mt-0.5 text-neutral-900 font-bold">{value}</p>
    </div>
  );
}
