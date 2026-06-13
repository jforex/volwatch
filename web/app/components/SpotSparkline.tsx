"use client";

import { ResponsiveContainer, LineChart, Line, YAxis, XAxis, Tooltip } from "recharts";
type SpotPoint = { ts: number; spot: number };
import { formatTime, formatUSD } from "../lib/format";

export function SpotSparkline({ data }: { data: SpotPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-neutral-300">
        Collecting price history…
      </div>
    );
  }

  const first = data[0].spot;
  const last = data[data.length - 1].spot;
  const up = last >= first;
  const color = up ? "#059669" : "#dc2626";

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="ts" hide />
          <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e5e5e5",
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "var(--font-mono, monospace)",
              color: "#171717",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
            labelStyle={{ color: "#525252", fontWeight: 600 }}
            labelFormatter={(ts) => formatTime(Number(ts))}
            formatter={(value) => [formatUSD(Number(value)), "spot"]}
          />
          <Line type="monotone" dataKey="spot" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
