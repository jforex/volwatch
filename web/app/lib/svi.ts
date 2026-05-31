// Pure SVI math. No React, no state. Easy to test in isolation.

export type SVIParams = {
  a: number;
  b: number;
  m: number;
  rho: number;
  sigma: number;
};

/** Raw SVI total variance at log-moneyness k. */
export function totalVariance(params: SVIParams, k: number): number {
  const { a, b, m, rho, sigma } = params;
  const dk = k - m;
  return a + b * (rho * dk + Math.sqrt(dk * dk + sigma * sigma));
}

/** Implied volatility at strike, given forward, params, and time to expiry (years). */
export function impliedVol(
  params: SVIParams,
  strike: number,
  forward: number,
  T: number,
): number {
  if (forward <= 0 || T <= 0) return NaN;
  const k = Math.log(strike / forward);
  const w = totalVariance(params, k);
  if (w <= 0) return NaN;
  return Math.sqrt(w / T);
}

/** Years between now and an expiry timestamp (ms). */
export function timeToExpiry(expiryMs: number, nowMs = Date.now()): number {
  const seconds = (expiryMs - nowMs) / 1000;
  return seconds / (365 * 24 * 3600);
}

/** Generate a smile curve: array of {strike, ivPct} across a range of strikes. */
export function smileCurve(
  params: SVIParams,
  forward: number,
  T: number,
  opts: { points?: number; widthPct?: number } = {},
) {
  const points = opts.points ?? 41;
  const widthPct = opts.widthPct ?? 0.08; // ±8% around forward
  const min = forward * (1 - widthPct);
  const max = forward * (1 + widthPct);
  const step = (max - min) / (points - 1);

  const out: { strike: number; ivPct: number }[] = [];
  for (let i = 0; i < points; i++) {
    const strike = min + i * step;
    const iv = impliedVol(params, strike, forward, T);
    out.push({ strike, ivPct: iv * 100 });
  }
  return out;
}
