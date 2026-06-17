"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { SVIParams } from "./svi";

export type NormalizedEvent =
  | { kind: "prices"; oracleId: string; spot: number; forward: number; ts: number }
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
  | { kind: "activated"; oracleId: string; expiryMs: number; ts: number }
  | { kind: "settled"; oracleId: string; settlementPrice: number; expiryMs: number; ts: number };

export type OracleState = {
  oracleId: string;
  expiryMs?: number;
  forward?: number;
  svi?: SVIParams;
};

export type StrikeBin = {
  strikeMid: number;
  notionalUp: number;
  notionalDn: number;
  net: number;
};

export type OracleExposure = {
  oracleId: string;
  expiryMs?: number;
  minStrike: number;
  maxStrike: number;
  mintedMinStrike: number;
  mintedMaxStrike: number;
  mtm: number;
  bins: StrikeBin[];
  totalUp: number;
  totalDn: number;
};
export type ExposureSnapshot = {
  ts: number;
  oracles: OracleExposure[];
};

export type VaultSnapshot = {
  ts: number;
  vaultBalance: number;
  plpSupply: number;
  pricePerShare: number;
  totalMaxPayout: number;
  totalMTM: number;
  utilizationPct: number;
  exposureCeilingPct: number;
  headroomPct: number;
  activeStrikeMatrices: number;
  settledOraclesCount: number;
  tradingPaused: boolean;
  withdrawalLimiter: { enabled: boolean; available: number; capacity: number };
};

type RawSnapshotOracle = {
  oracleId: string;
  expiryMs?: number;
  forward?: number;
  svi?: {
    a: string | number;
    b: string | number;
    m: { is_negative: boolean; magnitude: string | number } | number;
    rho: { is_negative: boolean; magnitude: string | number } | number;
    sigma: string | number;
  };
};

export type HistoryFrame = {
  ts: number;
  oracles: OracleState[];
  vault: VaultSnapshot | null;
};

type RawHistoryFrame = {
  ts: number;
  oracles: RawSnapshotOracle[];
  vault: VaultSnapshot | null;
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

const SCALE_AB_M_SIGMA = 1e6;
const SCALE_RHO = 1e9;

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  if (v && typeof v === "object" && "magnitude" in (v as object)) {
    const obj = v as { is_negative: boolean; magnitude: string | number };
    const mag = Number(obj.magnitude);
    return obj.is_negative ? -mag : mag;
  }
  return 0;
}

function normalizeSvi(raw: {
  a: string | number;
  b: string | number;
  m: { is_negative: boolean; magnitude: string | number } | number;
  rho: { is_negative: boolean; magnitude: string | number } | number;
  sigma: string | number;
}): SVIParams {
  return {
    a: toNum(raw.a) / SCALE_AB_M_SIGMA,
    b: toNum(raw.b) / SCALE_AB_M_SIGMA,
    m: toNum(raw.m) / SCALE_AB_M_SIGMA,
    rho: toNum(raw.rho) / SCALE_RHO,
    sigma: toNum(raw.sigma) / SCALE_AB_M_SIGMA,
  };
}

function normalizeFrame(raw: RawHistoryFrame): HistoryFrame {
  return {
    ts: raw.ts,
    vault: raw.vault,
    oracles: raw.oracles.map((o) => ({
      oracleId: o.oracleId,
      expiryMs: o.expiryMs,
      forward: o.forward,
      svi: o.svi ? normalizeSvi(o.svi) : undefined,
    })),
  };
}

export function useVolStream() {
  const [status, setStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [recent, setRecent] = useState<NormalizedEvent[]>([]);
  const [latestSpot, setLatestSpot] = useState<number | null>(null);
  const [spotHistory, setSpotHistory] = useState<{ ts: number; spot: number }[]>([]);
  const [oracles, setOracles] = useState<Record<string, OracleState>>({});
  const [vault, setVault] = useState<VaultSnapshot | null>(null);
  const [exposure, setExposure] = useState<ExposureSnapshot | null>(null);
  const [history, setHistory] = useState<HistoryFrame[]>([]);
  const [scrubTs, setScrubTs] = useState<number | null>(null);

  const oraclesRef = useRef<Record<string, OracleState>>({});
  const recentRef = useRef<NormalizedEvent[]>([]);
  const spotHistoryRef = useRef<{ ts: number; spot: number }[]>([]);
  const dirtyRef = useRef(false);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;

    const syncInterval = setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setOracles({ ...oraclesRef.current });
      setRecent([...recentRef.current]);
      setSpotHistory([...spotHistoryRef.current]);
    }, 100);

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      setStatus("connecting");

      ws.onopen = () => setStatus("open");
      ws.onclose = () => {
        setStatus("closed");
        if (!cancelled) setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (msg) => {
        let parsed: any;
        try {
          parsed = JSON.parse(msg.data);
        } catch {
          return;
        }
        if (parsed.type === "hello") return;
        if (parsed.type === "history") {
          const frames = (parsed.data as RawHistoryFrame[]).map(normalizeFrame);
          setHistory(frames);
          return;
        }
        if (parsed.type === "history-frame") {
          const frame = normalizeFrame(parsed.data as RawHistoryFrame);
          setHistory((h) => {
            const next = [...h, frame];
            const cutoff = Date.now() - 30 * 60 * 1000;
            return next.filter((f) => f.ts >= cutoff);
          });
          return;
        }
        if (parsed.type === "vault") {
          setVault(parsed.data as VaultSnapshot);
          return;
        }

        if (parsed.type === "exposure") {
          setExposure(parsed.data as ExposureSnapshot);
          return;
        }

        if (parsed.type === "event") {
          const evt = parsed.data as NormalizedEvent;

          // TEMP DEBUG
          if (typeof window !== "undefined") {
            (window as any).__debugCounts = (window as any).__debugCounts ?? {};
            (window as any).__debugCounts[evt.kind] = ((window as any).__debugCounts[evt.kind] ?? 0) + 1;
          }

          recentRef.current = [evt, ...recentRef.current].slice(0, 100);
          const existing = oraclesRef.current[evt.oracleId] ?? { oracleId: evt.oracleId };
          if (evt.kind === "prices") {
            setLatestSpot(evt.spot);
            spotHistoryRef.current = [...spotHistoryRef.current, { ts: evt.ts, spot: evt.spot }].slice(-120);
            oraclesRef.current = {
              ...oraclesRef.current,
              [evt.oracleId]: { ...existing, forward: evt.forward },
            };
          } else if (evt.kind === "svi") {
            const normalizedSvi = normalizeSvi({ a: evt.a, b: evt.b, m: evt.m, rho: evt.rho, sigma: evt.sigma });
            // TEMP DEBUG
            if (typeof window !== "undefined") {
              (window as any).__debugSviSample = normalizedSvi;
              (window as any).__debugSviRawSample = { a: evt.a, b: evt.b, m: evt.m, rho: evt.rho, sigma: evt.sigma };
              (window as any).__debugOraclesWithSvi = ((window as any).__debugOraclesWithSvi ?? new Set());
              (window as any).__debugOraclesWithSvi.add(evt.oracleId);
            }
            oraclesRef.current = {
              ...oraclesRef.current,
              [evt.oracleId]: {
                ...existing,
                svi: normalizedSvi,
              },
            };
          } else if (evt.kind === "activated") {
            oraclesRef.current = {
              ...oraclesRef.current,
              [evt.oracleId]: { ...existing, expiryMs: evt.expiryMs },
            };
          }
          dirtyRef.current = true;
        }
      };
    }
    connect();
    return () => {
      cancelled = true;
      clearInterval(syncInterval);
      wsRef.current?.close();
    };
  }, []);

  const { resolvedOracles, resolvedVault, isScrubbing } = useMemo(() => {
    if (scrubTs == null || history.length === 0) {
      return { resolvedOracles: oracles, resolvedVault: vault, isScrubbing: false };
    }
    let frame: HistoryFrame | null = null;
    for (const f of history) {
      if (f.ts <= scrubTs) frame = f;
      else break;
    }
    if (!frame) frame = history[0];
    const resolved: Record<string, OracleState> = {};
    for (const o of frame.oracles) resolved[o.oracleId] = o;
    return { resolvedOracles: resolved, resolvedVault: frame.vault, isScrubbing: true };
  }, [scrubTs, history, oracles, vault]);

  const scrubRange = useMemo(() => {
    if (history.length === 0) return null;
    return { min: history[0].ts, max: history[history.length - 1].ts };
  }, [history]);

  const goLive = useCallback(() => setScrubTs(null), []);

  return {
    status,
    recent,
    latestSpot,
    spotHistory,
    oracles: resolvedOracles,
    vault: resolvedVault,
    exposure,
    oracleCount: Object.keys(resolvedOracles).length,
    history,
    scrubTs,
    setScrubTs,
    isScrubbing,
    scrubRange,
    goLive,
  };
}