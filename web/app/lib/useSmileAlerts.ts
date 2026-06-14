"use client";

import { useEffect, useRef, useState } from "react";
import { classifySmile } from "./classifySmile";
import type { OracleState } from "./useVolStream";

export type SmileAlert = {
  id: string;
  oracleId: string;
  ts: number;
  fromLabel: string;
  fromVariant?: string;
  toLabel: string;
  toVariant?: string;
  toTone: "blue" | "red" | "emerald" | "amber";
  minutesToExpiry: number;
};

const MAX_ALERTS = 20;
const ALERT_DEDUPE_MS = 5000; // ignore back-to-back classification flips within 5s

export function useSmileAlerts(oracles: Record<string, OracleState>) {
  const previousRef = useRef<Map<string, { label: string; variant?: string; ts: number }>>(new Map());
  const [alerts, setAlerts] = useState<SmileAlert[]>([]);

  useEffect(() => {
    const now = Date.now();
    const newAlerts: SmileAlert[] = [];

    for (const oracle of Object.values(oracles)) {
      if (!oracle.svi || !oracle.expiryMs || oracle.expiryMs <= now) continue;

      const current = classifySmile(oracle.svi);
      const previous = previousRef.current.get(oracle.oracleId);

      if (previous) {
        // Classification changed?
        const changed = previous.label !== current.label || previous.variant !== current.variant;
        const recent = now - previous.ts < ALERT_DEDUPE_MS;

        if (changed && !recent) {
          newAlerts.push({
            id: `${oracle.oracleId}-${now}`,
            oracleId: oracle.oracleId,
            ts: now,
            fromLabel: previous.label,
            fromVariant: previous.variant,
            toLabel: current.label,
            toVariant: current.variant,
            toTone: current.tone,
            minutesToExpiry: Math.round((oracle.expiryMs - now) / 60000),
          });
        }
      }

      // Update previous state regardless
      if (!previous || previous.label !== current.label || previous.variant !== current.variant) {
        previousRef.current.set(oracle.oracleId, {
          label: current.label,
          variant: current.variant,
          ts: now,
        });
      }
    }

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, MAX_ALERTS));
    }
  }, [oracles]);

  function clearAlerts() {
    setAlerts([]);
  }

  function dismissAlert(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  return { alerts, clearAlerts, dismissAlert };
}