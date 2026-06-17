// SVI math for DeepBook Predict.
//
// CORRECTION (verified empirically Jan 2026): Predict's SVI returns
// TOTAL variance over [0, T], the standard Gatheral SVI form.
// → Implied vol: σ_IV = sqrt(w(k) / T), where T is time to expiry in years.
// Earlier guess that w was already annualized produced 100× too-small IVs.

export type SVIParams = {
  a: number;
  b: number;
  m: number;
  rho: number;
  sigma: number;
};

/** Predict's SVI variance at log-moneyness k. (Already annualized — do not divide by T.) */
export function totalVariance(params: SVIParams, k: number): number {
  const { a, b, m, rho, sigma } = params;
  const dk = k - m;
  return a + b * (rho * dk + Math.sqrt(dk * dk + sigma * sigma));
}

/** Implied volatility (annualized) at strike, given forward and SVI params. */
export function impliedVol(
  params: SVIParams,
  strike: number,
  forward: number,
  _T?: number,
): number {
  if (forward <= 0) return NaN;
  const k = Math.log(strike / forward);
  const w = totalVariance(params, k);
  if (w <= 0) return NaN;
  return Math.sqrt(w);
}

/** ATM implied vol — IV at forward (k=0). Predict's SVI returns annualized variance. */
export function atmIV(params: SVIParams, _T?: number): number {
  const w = totalVariance(params, 0);
  if (w <= 0) return NaN;
  return Math.sqrt(w);
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
  opts: { points?: number; widthPct?: number } = {},
) {
  const points = opts.points ?? 41;
  const widthPct = opts.widthPct ?? 0.25;
  const min = forward * (1 - widthPct);
  const max = forward * (1 + widthPct);
  const step = (max - min) / (points - 1);

  const out: { strike: number; ivPct: number }[] = [];
  for (let i = 0; i < points; i++) {
    const strike = min + i * step;
    const iv = impliedVol(params, strike, forward);
    out.push({ strike, ivPct: iv * 100 });
  }
  return out;
}
