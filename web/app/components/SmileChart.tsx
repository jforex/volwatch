"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from "recharts";
import { OracleState } from "../lib/useVolStream";
import { smileCurve } from "../lib/svi";
import { formatUSD, shortId } from "../lib/format";

export function SmileChart({ oracle }: { oracle: OracleState }) {
  if (!oracle.svi || !oracle.forward || !oracle.expiryMs) {
    return (
      <div className="flex h-64 items-center justify-center text-center font-mono text-xs text-neutral-300">
        Waiting for SVI + forward + expiry…
      </div>
    );
  }

  if (oracle.expiryMs <= Date.now()) {
    return (
      <div className="flex h-64 items-center justify-center text-center font-mono text-xs text-neutral-300">
        Oracle expired
      </div>
    );
  }

  const curve = smileCurve(oracle.svi, oracle.forward, { widthPct: 0.25 });
  const expiryDate = new Date(oracle.expiryMs);
  const minsToExpiry = Math.round((oracle.expiryMs - Date.now()) / 60000);

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-baseline justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-300 font-semibold">VOL SMILE</p>
          <p className="mt-1 font-mono text-sm text-white truncate">{shortId(oracle.oracleId)}</p>
        </div>
        <div className="text-right font-mono text-xs shrink-0">
          <p className="text-neutral-300">Forward <span className="font-bold text-white">{formatUSD(oracle.forward)}</span></p>
          <p className="mt-0.5 text-neutral-300">
            Expires in <span className="font-bold text-blue-300">{minsToExpiry}m</span>
            <span className="text-neutral-200"> · {expiryDate.toLocaleTimeString()}</span>
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={curve} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="#262626" vertical={false} />
            <XAxis
              dataKey="strike"
              tick={{ fontSize: 11, fill: "#a3a3a3", fontFamily: "monospace" }}
              tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
              stroke="#404040"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#a3a3a3", fontFamily: "monospace" }}
              tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
              stroke="#404040"
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #404040",
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "monospace",
                color: "#f5f5f5",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              }}
              labelStyle={{ color: "#a3a3a3", fontWeight: 600 }}
              labelFormatter={(v) => `Strike ${formatUSD(Number(v))}`}
              formatter={(value) => [`${Number(value).toFixed(2)}%`, "Implied vol"]}
            />
            <ReferenceLine
              x={oracle.forward}
              stroke="#60a5fa"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              label={{ value: "ATM", position: "top", fill: "#60a5fa", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }}
            />
            <Line
              type="monotone"
              dataKey="ivPct"
              stroke="#60a5fa"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* SVI parameters */}
      <div className="mt-4 grid grid-cols-5 gap-2 border-t border-neutral-800 pt-3 font-mono text-xs">
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
      <p className="text-neutral-300 font-semibold">{label}</p>
      <p className="mt-0.5 text-white font-bold">{value}</p>
    </div>
  );
}