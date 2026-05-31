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

const MAX_RECENT = 100;

export function useVolStream() {
  const [status, setStatus] = useState<Status>("connecting");
  const [recent, setRecent] = useState<VolEvent[]>([]);
  const [latestSpot, setLatestSpot] = useState<number | null>(null);
  const [oracleCount, setOracleCount] = useState(0);
  const seenOracles = useRef(new Set<string>());

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

        if (e.kind === "prices") setLatestSpot(e.spot);

        setRecent((prev) => {
          const next = [e, ...prev];
          return next.length > MAX_RECENT ? next.slice(0, MAX_RECENT) : next;
        });
      } catch {
        /* ignore parse errors */
      }
    };

    return () => ws.close();
  }, []);

  return { status, recent, latestSpot, oracleCount };
}
