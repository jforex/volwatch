"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatUSD, formatTime } from "../lib/format";

type Props = {
  data: { ts: number; spot: number }[];
  height?: number;
};
export function SpotChart({ data, height = 256 }: Props) {
  const chartData = useMemo(
    () => data.map((d) => ({ time: d.ts, price: d.spot })),
    [data],
  );

if (chartData.length < 2) {
    return (
      <div className="flex items-center justify-center text-sm text-neutral-500" style={{ height }}>
        Waiting for price data…
      </div>
    );
  }

  const prices = chartData.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = (max - min) * 0.1 || 1;
  const domain: [number, number] = [min - pad, max + pad];

return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spotGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(96, 165, 250)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="rgb(96, 165, 250)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(38, 38, 38)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(ts) => formatTime(ts)}
            stroke="rgb(115, 115, 115)"
            tick={{ fill: "rgb(163, 163, 163)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgb(38, 38, 38)" }}
            minTickGap={48}
          />
          <YAxis
            domain={domain}
            tickFormatter={(v) => formatUSD(v)}
            stroke="rgb(115, 115, 115)"
            tick={{ fill: "rgb(163, 163, 163)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "rgb(38, 38, 38)" }}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgb(23, 23, 23)",
              border: "1px solid rgb(64, 64, 64)",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "12px",
              padding: "8px 12px",
            }}
            labelStyle={{ color: "rgb(163, 163, 163)", marginBottom: "4px" }}
            itemStyle={{ color: "rgb(96, 165, 250)", fontWeight: "bold" }}
            labelFormatter={(ts) => formatTime(ts as number)}
            formatter={(v: number) => [formatUSD(v), "BTC"]}
            cursor={{ stroke: "rgb(96, 165, 250)", strokeWidth: 1, strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke="rgb(96, 165, 250)"
            strokeWidth={2}
            fill="url(#spotGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
