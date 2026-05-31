"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

// SVI fixed-point scales differ per parameter.
// Empirically, a/b/m/sigma look like 1e6-scaled, rho like 1e9-scaled.
// Reference event: a=7112, b=549259, m=1097485, sigma=1056137 → 0.007, 0.55, 0.001, 1.06
// rho=419465799 → 0.42 (correlation, must be in [-1, 1])
const SCALE_AB_M_SIGMA = 1e6;
const SCALE_RHO = 1e9;

function signedToFloat(
  s: { is_negative: boolean; magnitude: string },
  scale: number,
) {
  const v = Number(s.magnitude) / scale;
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
              a: Number(e.a) / SCALE_AB_M_SIGMA,
              b: Number(e.b) / SCALE_AB_M_SIGMA,
              m: signedToFloat(e.m, SCALE_AB_M_SIGMA),
              rho: signedToFloat(e.rho, SCALE_RHO),
              sigma: Number(e.sigma) / SCALE_AB_M_SIGMA,
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

  // Only count oracles whose expiry is still in the future.
  const activeOracleCount = useMemo(() => {
    const now = Date.now();
    return Object.values(oracles).filter(
      (o) => o.expiryMs !== undefined && o.expiryMs > now,
    ).length;
  }, [oracles]);

  return {
    status,
    recent,
    latestSpot,
    spotHistory,
    oracles,
    oracleCount: activeOracleCount,
  };
}
