"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { OracleState } from "../lib/useVolStream";
import { smileCurve, timeToExpiry } from "../lib/svi";
import { formatUSD, shortId } from "../lib/format";

export function SmileChart({ oracle }: { oracle: OracleState }) {
  if (!oracle.svi || !oracle.forward || !oracle.expiryMs) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-neutral-600">
        Waiting for SVI + forward + expiry…
      </div>
    );
  }

  const T = timeToExpiry(oracle.expiryMs);
  if (T <= 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-neutral-600">
        Oracle expired
      </div>
    );
  }

  const curve = smileCurve(oracle.svi, oracle.forward, T);
  const expiryDate = new Date(oracle.expiryMs);
  const minsToExpiry = Math.round((oracle.expiryMs - Date.now()) / 60000);

  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-neutral-500">
            Vol smile
          </p>
          <p className="mt-1 font-mono text-sm text-neutral-400">
            {shortId(oracle.oracleId)}
          </p>
        </div>
        <div className="text-right text-xs text-neutral-500">
          <p>
            Forward{" "}
            <span className="font-mono text-neutral-300">
              {formatUSD(oracle.forward)}
            </span>
          </p>
          <p className="mt-0.5">
            Expires in{" "}
            <span className="font-mono text-amber-400">{minsToExpiry}m</span>
            {" · "}
            <span className="font-mono">{expiryDate.toLocaleTimeString()}</span>
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={curve}
            margin={{ top: 8, right: 12, bottom: 4, left: 0 }}
          >
            <CartesianGrid stroke="#1c1c1c" vertical={false} />
            <XAxis
              dataKey="strike"
              tick={{ fontSize: 10, fill: "#737373", fontFamily: "monospace" }}
              tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
              stroke="#262626"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#737373", fontFamily: "monospace" }}
              tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
              stroke="#262626"
              width={42}
            />
            <Tooltip
              contentStyle={{
                background: "#0a0a0a",
                border: "1px solid #262626",
                borderRadius: 6,
                fontSize: 11,
                fontFamily: "monospace",
              }}
              labelStyle={{ color: "#a3a3a3" }}
              labelFormatter={(v) => `Strike ${formatUSD(Number(v))}`}
              formatter={(value: number) => [
                `${value.toFixed(2)}%`,
                "Implied vol",
              ]}
            />
            <ReferenceLine
              x={oracle.forward}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: "ATM",
                position: "top",
                fill: "#f59e0b",
                fontSize: 10,
                fontFamily: "monospace",
              }}
            />
            <Line
              type="monotone"
              dataKey="ivPct"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* SVI params readout */}
      <div className="mt-4 grid grid-cols-5 gap-2 border-t border-neutral-900 pt-3 font-mono text-[10px] text-neutral-500">
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
      <p className="text-neutral-600">{label}</p>
      <p className="mt-0.5 text-neutral-300">{value}</p>
    </div>
  );
}
