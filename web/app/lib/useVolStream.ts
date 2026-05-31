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

export type OracleState = {
  oracleId: string;
  spot?: number;
  forward?: number;
  expiryMs?: number;
  svi?: {
    a: number;
    b: number;
    m: number;
    rho: number;
    sigma: number;
  };
  lastTs: number;
};

const MAX_RECENT = 100;
const MAX_SPOT_POINTS = 120;

// SVI params come scaled. Empirically from the events you saw, they look like
// fixed-point with ~9 decimals for the absolute params (a, b, m, sigma) and
// ~9 decimals for rho. We normalize to floats here.
const SCALE = 1e9;

function signedToFloat(s: { is_negative: boolean; magnitude: string }) {
  const v = Number(s.magnitude) / SCALE;
  return s.is_negative ? -v : v;
}

export function useVolStream() {
  const [status, setStatus] = useState<Status>("connecting");
  const [recent, setRecent] = useState<VolEvent[]>([]);
  const [latestSpot, setLatestSpot] = useState<number | null>(null);
  const [spotHistory, setSpotHistory] = useState<SpotPoint[]>([]);
  const [oracles, setOracles] = useState<Record<string, OracleState>>({});
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

        // Update per-oracle state
        setOracles((prev) => {
          const cur = prev[e.oracleId] ?? {
            oracleId: e.oracleId,
            lastTs: 0,
          };
          const next: OracleState = { ...cur, lastTs: e.ts };
          if (e.kind === "prices") {
            next.spot = e.spot;
            next.forward = e.forward;
          } else if (e.kind === "svi") {
            next.svi = {
              a: Number(e.a) / SCALE,
              b: Number(e.b) / SCALE,
              m: signedToFloat(e.m),
              rho: signedToFloat(e.rho),
              sigma: Number(e.sigma) / SCALE,
            };
          } else if (e.kind === "activated") {
            next.expiryMs = e.expiryMs;
          } else if (e.kind === "settled") {
            next.expiryMs = e.expiryMs;
          }
          return { ...prev, [e.oracleId]: next };
        });

        if (e.kind === "prices") {
          setLatestSpot(e.spot);
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

  return {
    status,
    recent,
    latestSpot,
    spotHistory,
    oracles,
    oracleCount: Object.keys(oracles).length,
  };
}
