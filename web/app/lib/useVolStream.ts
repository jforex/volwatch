"use client";

import { useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

export type VolEvent =
  | {
      kind: "prices";
      oracleId: string;
      spot: number;
      forward: number;
      ts: number;
    }
  | {
      kind: "svi";
      oracleId: string;
      a: string;
      b: string;
      m: { is_negative: boolean; magnitude: string };
      rho: { is_negative: boolean; magnitude: string };
      sigma: string;
      ts: number;
    }
  | {
      kind: "activated";
      oracleId: string;
      expiryMs: number;
      ts: number;
    }
  | {
      kind: "settled";
      oracleId: string;
      settlementPrice: number;
      expiryMs: number;
      ts: number;
    };

type Status = "connecting" | "open" | "closed";

export type SpotPoint = { ts: number; spot: number };

const MAX_RECENT = 100;
const MAX_SPOT_POINTS = 120; // ~6 minutes at one point every 3s

export function useVolStream() {
  const [status, setStatus] = useState<Status>("connecting");
  const [recent, setRecent] = useState<VolEvent[]>([]);
  const [latestSpot, setLatestSpot] = useState<number | null>(null);
  const [oracleCount, setOracleCount] = useState(0);
  const [spotHistory, setSpotHistory] = useState<SpotPoint[]>([]);
  const seenOracles = useRef(new Set<string>());
  const lastSpotTsRef = useRef<number>(0);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setStatus("open");
    ws.onclose = () => setStatus("closed");
    ws.onerror = () => setStatus("closed");

    ws.onmessage = (msg) => {
      try {
        const parsed = JSON.parse(msg.data);
        if (parsed.type !== "event") return;
        const e: VolEvent = parsed.data;

        seenOracles.current.add(e.oracleId);
        setOracleCount(seenOracles.current.size);

        if (e.kind === "prices") {
          setLatestSpot(e.spot);
          // Sample at most once per second to keep the chart smooth.
          // All oracles emit the same spot in the same batch, so we only
          // need one point per timestamp.
          if (e.ts > lastSpotTsRef.current + 900) {
            lastSpotTsRef.current = e.ts;
            setSpotHistory((prev) => {
              const next = [...prev, { ts: e.ts, spot: e.spot }];
              return next.length > MAX_SPOT_POINTS
                ? next.slice(next.length - MAX_SPOT_POINTS)
                : next;
            });
          }
        }

        setRecent((prev) => {
          const next = [e, ...prev];
          return next.length > MAX_RECENT ? next.slice(0, MAX_RECENT) : next;
        });
      } catch {
        /* ignore */
      }
    };

    return () => ws.close();
  }, []);

  return { status, recent, latestSpot, oracleCount, spotHistory };
}
