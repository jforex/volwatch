// Arbitrage-free checks for SVI surfaces.
//
// Two classic conditions:
// 1. BUTTERFLY (single expiry, across strikes):
//    Gatheral's g(k) function must be ≥ 0 for all k. If it goes negative,
//    the smile is locally concave somewhere, allowing a static butterfly arbitrage.
//
// 2. CALENDAR (across expiries, same strike):
//    Total variance w(k, T) must be non-decreasing in T.
//    Reminder: Predict's SVI is per-unit-time variance (IV²), so "total variance"
//    over [0, T] is approximately w_predict(k) × T. We compare that across expiries.

import { SVIParams, totalVariance } from "./svi";

// --- Butterfly check (Gatheral g function) -----------------------------------

/**
 * Gatheral's g(k) function for SVI.
 * g(k) = (1 - k·w'(k) / (2·w(k)))² - (w'(k))²/4 · (1/w(k) + 1/4) + w''(k)/2
 *
 * Smile is butterfly-arb-free iff g(k) ≥ 0 everywhere.
 *
 * NOTE: Predict's "w" is annualized variance, not total variance over [0,T].
 * For butterfly purposes the math is the same — we just check shape — but the
 * derived "fake densities" only make sense after scaling by T. We use w as-is here
 * because the *sign* of g is what matters for arb detection.
 */
function w(params: SVIParams, k: number): number {
  return totalVariance(params, k);
}

function wPrime(params: SVIParams, k: number): number {
  const { b, m, rho, sigma } = params;
  const dk = k - m;
  const root = Math.sqrt(dk * dk + sigma * sigma);
  return b * (rho + dk / root);
}

function wDoublePrime(params: SVIParams, k: number): number {
  const { b, m, sigma } = params;
  const dk = k - m;
  const root = Math.sqrt(dk * dk + sigma * sigma);
  // d/dk [dk/root] = sigma² / root³
  return (b * sigma * sigma) / (root * root * root);
}

export function gatheralG(params: SVIParams, k: number): number {
  const W = w(params, k);
  if (W <= 0) return -Infinity;
  const Wp = wPrime(params, k);
  const Wpp = wDoublePrime(params, k);
  const t1 = 1 - (k * Wp) / (2 * W);
  const term1 = t1 * t1;
  const term2 = ((Wp * Wp) / 4) * (1 / W + 0.25);
  const term3 = Wpp / 2;
  return term1 - term2 + term3;
}

export type ButterflyCheck = {
  arbFree: boolean;
  minG: number;
  minGAt: number; // log-moneyness where g is minimized
  // How "deep" the violation is. 0 = exactly arb-free at the worst point.
  // Negative = violated.
  severity: "ok" | "warn" | "violation";
};

/** Sample g(k) across a window and report the minimum. */
export function checkButterfly(
  params: SVIParams,
  opts: { kMin?: number; kMax?: number; points?: number } = {},
): ButterflyCheck {
  const kMin = opts.kMin ?? -0.3;
  const kMax = opts.kMax ?? 0.3;
  const points = opts.points ?? 121;
  const step = (kMax - kMin) / (points - 1);

  let minG = Infinity;
  let minGAt = 0;
  for (let i = 0; i < points; i++) {
    const k = kMin + i * step;
    const g = gatheralG(params, k);
    if (g < minG) {
      minG = g;
      minGAt = k;
    }
  }

  let severity: ButterflyCheck["severity"];
  if (minG >= 0) severity = "ok";
  else if (minG > -0.001) severity = "warn"; // numerical noise / borderline
  else severity = "violation";

  return {
    arbFree: minG >= 0,
    minG,
    minGAt,
    severity,
  };
}

// --- Calendar check ----------------------------------------------------------

export type CalendarPair = {
  shortOracleId: string;
  longOracleId: string;
  shortExpiryMs: number;
  longExpiryMs: number;
  // Sample some strikes and report worst violation.
  worstK: number;
  worstShortTotalVar: number;
  worstLongTotalVar: number;
  // If short's total variance > long's, that's a calendar arb (short expensive vs long).
  arbFree: boolean;
  severity: "ok" | "warn" | "violation";
};

type OracleForCalendar = {
  oracleId: string;
  svi: SVIParams;
  expiryMs: number;
  forward: number;
};

/** Years between now and expiryMs. */
function yearsTo(expiryMs: number): number {
  return (expiryMs - Date.now()) / 1000 / (365 * 24 * 3600);
}

/**
 * For two oracles (short-dated and long-dated), check whether the longer
 * has higher *total variance* than the shorter at a grid of strikes.
 * Predict's SVI is per-unit-time, so total variance over [0, T] ≈ w_predict × T.
 */
export function checkCalendarPair(
  shortO: OracleForCalendar,
  longO: OracleForCalendar,
): CalendarPair {
  const tShort = yearsTo(shortO.expiryMs);
  const tLong = yearsTo(longO.expiryMs);

  // Sample around the average forward, in log-moneyness terms.
  // Use shortO.forward as the anchor since the strikes most users care about live there.
  const points = 21;
  const kMin = -0.2;
  const kMax = 0.2;
  const step = (kMax - kMin) / (points - 1);

  let worstK = 0;
  let worstShortVar = 0;
  let worstLongVar = 0;
  let maxViolation = 0; // positive = how much short exceeds long

  for (let i = 0; i < points; i++) {
    const k = kMin + i * step;
    const wShort = totalVariance(shortO.svi, k) * tShort;
    const wLong = totalVariance(longO.svi, k) * tLong;
    const viol = wShort - wLong;
    if (viol > maxViolation) {
      maxViolation = viol;
      worstK = k;
      worstShortVar = wShort;
      worstLongVar = wLong;
    }
  }

  let severity: CalendarPair["severity"];
  if (maxViolation <= 0) severity = "ok";
  else if (maxViolation < 0.0001) severity = "warn";
  else severity = "violation";

  return {
    shortOracleId: shortO.oracleId,
    longOracleId: longO.oracleId,
    shortExpiryMs: shortO.expiryMs,
    longExpiryMs: longO.expiryMs,
    worstK,
    worstShortTotalVar: worstShortVar,
    worstLongTotalVar: worstLongVar,
    arbFree: maxViolation <= 0,
    severity,
  };
}

/** Build all calendar pairs from a list of fully-stated oracles, sorted by expiry. */
export function checkAllCalendars(
  oracles: OracleForCalendar[],
): CalendarPair[] {
  const sorted = [...oracles].sort((a, b) => a.expiryMs - b.expiryMs);
  const pairs: CalendarPair[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    pairs.push(checkCalendarPair(sorted[i], sorted[i + 1]));
  }
  return pairs;
}
