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
  ReferenceDot,
} from "recharts";
import { atmIV } from "../lib/svi";
import type { OracleState } from "../lib/useVolStream";

type Props = {
  oracles: Record<string, OracleState>;
  now: number;
  height?: number;
};

export function TermStructureChart({ oracles, now, height = 200 }: Props) {
const data = useMemo(() => {
    const points = Object.values(oracles)
      .filter(
        (o) =>
          o.svi &&
          o.forward !== undefined &&
          o.expiryMs !== undefined &&
          o.expiryMs > now,
      )
      .map((o) => {
        const iv = atmIV(o.svi!);
        return {
          expiryMs: o.expiryMs!,
          minutesOut: (o.expiryMs! - now) / 60000,
          iv: iv * 100,
          oracleId: o.oracleId,
        };
      })
      .sort((a, b) => a.expiryMs - b.expiryMs);
    return points;
  }, [oracles, now]);

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center text-xs text-neutral-500" style={{ height }}>
        Need at least 2 active oracles to plot term structure.
      </div>
    );
  }

  // Classify term shape
  const first = data[0].iv;
  const last = data[data.length - 1].iv;
  const delta = last - first;
  const shape =
    Math.abs(delta) < 1.5
      ? { label: "FLAT", tone: "text-neutral-400" }
      : delta > 0
        ? { label: "CONTANGO", tone: "text-emerald-400" }
        : { label: "BACKWARDATION", tone: "text-amber-400" };

  return (
    <div className="flex flex-col" style={{ height }}>
      <div className="px-4 pt-2 pb-1 flex items-baseline justify-between">
        <span className={`font-mono text-[10px] uppercase tracking-widest font-bold ${shape.tone}`}>
          {shape.label}
        </span>
        <span className="font-mono text-[10px] text-neutral-500">
          {data.length} expiries · Δ {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
        </span>
      </div>
      <div className="flex-1 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="rgb(38, 38, 38)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="minutesOut"
              type="number"
              tickFormatter={(m) => (m < 60 ? `${Math.round(m)}m` : `${(m / 60).toFixed(1)}h`)}
              stroke="rgb(115, 115, 115)"
              tick={{ fill: "rgb(163, 163, 163)", fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: "rgb(38, 38, 38)" }}
              minTickGap={32}
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
              labelFormatter={(m) => {
                const min = m as number;
                return min < 60 ? `${Math.round(min)} min out` : `${(min / 60).toFixed(2)} hours out`;
              }}
              formatter={(v: number) => [`${v.toFixed(1)}%`, "ATM IV"]}
              cursor={{ stroke: "rgb(96, 165, 250)", strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Line
              type="monotone"
              dataKey="iv"
              stroke="rgb(96, 165, 250)"
              strokeWidth={2}
              dot={{ r: 3, fill: "rgb(96, 165, 250)", stroke: "rgb(23, 23, 23)", strokeWidth: 1 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
