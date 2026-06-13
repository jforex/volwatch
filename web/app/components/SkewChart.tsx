"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { totalVariance, atmIV } from "../lib/svi";
import { classifySmile } from "../lib/classifySmile";
import type { OracleState } from "../lib/useVolStream";

type Props = {
  oracles: Record<string, OracleState>;
  now: number;
  height?: number;
};

export function SkewChart({ oracles, now, height = 200 }: Props) {
const { data, shape, nearestExpiryMs, atm } = useMemo(() => {
    const candidates = Object.values(oracles)
      .filter(
        (o) =>
          o.svi &&
          o.forward !== undefined &&
          o.expiryMs !== undefined &&
          o.expiryMs > now,
      )
      .sort((a, b) => (a.expiryMs! - b.expiryMs!));

    if (candidates.length === 0) {
      return { data: [], shape: null, nearestExpiryMs: null, atm: null };
    }

    const nearest = candidates[0];
    const F = nearest.forward!;
    const params = nearest.svi!;

    const points: { k: number; strike: number; iv: number }[] = [];
    for (let k = -0.3; k <= 0.3 + 1e-9; k += 0.025) {
      const w = totalVariance(params, k);
      const iv = w > 0 ? Math.sqrt(w) : 0;
      points.push({
        k,
        strike: F * Math.exp(k),
        iv: iv * 100,
      });
    }

    const atmValue = atmIV(params) * 100;
    const classification = classifySmile(params);

    return {
      data: points,
      shape: classification,
      nearestExpiryMs: nearest.expiryMs!,
      atm: atmValue,
    };
  }, [oracles, now]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-xs text-neutral-300" style={{ height }}>
        No active oracle to plot skew.
      </div>
    );
  }

  const minutesToExpiry = nearestExpiryMs ? Math.round((nearestExpiryMs - now) / 60000) : 0;
  const expiryLabel = minutesToExpiry < 60 ? `${minutesToExpiry}m` : `${(minutesToExpiry / 60).toFixed(1)}h`;

  const toneClass =
    shape?.tone === "red" ? "text-red-400" :
    shape?.tone === "emerald" ? "text-emerald-400" :
    shape?.tone === "amber" ? "text-amber-400" :
    "text-neutral-200";

return (
    <div className="flex flex-col" style={{ height }}>
      <div className="px-4 pt-2 pb-1 flex items-baseline justify-between shrink-0">
        <span className={`font-mono text-xs uppercase tracking-widest font-bold ${toneClass}`}>
          {shape?.label}{shape?.variant ? ` (${shape.variant})` : ""}
        </span>
        <span className="font-mono text-xs text-neutral-300">
          {expiryLabel} · ATM {atm?.toFixed(1)}%
        </span>
      </div>
      <div className="flex-1 px-2 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="rgb(38, 38, 38)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="k"
              type="number"
              tickFormatter={(k) => k.toFixed(2)}
              stroke="rgb(115, 115, 115)"
              tick={{ fill: "rgb(163, 163, 163)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgb(38, 38, 38)" }}
              ticks={[-0.3, -0.15, 0, 0.15, 0.3]}
              domain={[-0.3, 0.3]}
            />
            <YAxis
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              stroke="rgb(115, 115, 115)"
              tick={{ fill: "rgb(163, 163, 163)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgb(38, 38, 38)" }}
              width={42}
              domain={["auto", "auto"]}
            />
            <ReferenceLine
              x={0}
              stroke="rgb(96, 165, 250)"
              strokeDasharray="2 4"
              strokeOpacity={0.5}
              label={{ value: "ATM", position: "top", fill: "rgb(96, 165, 250)", fontSize: 9 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgb(23, 23, 23)",
                border: "1px solid rgb(64, 64, 64)",
                borderRadius: "6px",
                fontFamily: "monospace",
                fontSize: "11px",
                padding: "6px 10px",
              }}
              labelStyle={{ color: "rgb(163, 163, 163)" }}
              itemStyle={{ color: "rgb(96, 165, 250)", fontWeight: "bold" }}
              labelFormatter={(k) => `k=${(k as number).toFixed(3)}`}
              formatter={(v: number, _name: string, item: { payload?: { strike?: number } }) => {
                const strike = item?.payload?.strike;
                return [`${v.toFixed(1)}% (K=$${strike?.toLocaleString("en-US", { maximumFractionDigits: 0 })})`, "IV"];
              }}
              cursor={{ stroke: "rgb(96, 165, 250)", strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Line
              type="monotone"
              dataKey="iv"
              stroke="#60a5fa"
              strokeWidth={2.5}
              dot={{ r: 2, fill: "#60a5fa", stroke: "#60a5fa" }}
              activeDot={{ r: 5, fill: "#60a5fa" }}
              isAnimationActive={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
