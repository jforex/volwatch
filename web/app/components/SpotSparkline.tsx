"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  XAxis,
  Tooltip,
} from "recharts";
import { SpotPoint } from "../lib/useVolStream";
import { formatTime, formatUSD } from "../lib/format";

export function SpotSparkline({ data }: { data: SpotPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-neutral-600">
        Collecting price history…
      </div>
    );
  }

  const first = data[0].spot;
  const last = data[data.length - 1].spot;
  const up = last >= first;
  const color = up ? "#34d399" : "#f87171";

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="ts" hide />
          <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
          <Tooltip
            contentStyle={{
              background: "#0a0a0a",
              border: "1px solid #262626",
              borderRadius: 6,
              fontSize: 11,
              fontFamily: "var(--font-mono, monospace)",
            }}
            labelStyle={{ color: "#737373" }}
            labelFormatter={(ts) => formatTime(Number(ts))}
            formatter={(value: number) => [formatUSD(value), "spot"]}
          />
          <Line
            type="monotone"
            dataKey="spot"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
