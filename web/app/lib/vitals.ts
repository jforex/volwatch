// Vitals: 5 single-glance health indicators that translate the dashboard
// into traffic-light status anyone can read at a glance.

import { OracleState, VaultSnapshot } from "./useVolStream";
import { atmIV } from "./svi";
import { checkButterfly } from "./arbitrage";

export type VitalLevel = "good" | "watch" | "alert" | "neutral";

export type Vital = {
  id: string;
  label: string;
  status: string; // short label: "Quiet", "At risk", etc.
  detail: string; // one-line plain English
  level: VitalLevel;
  // 0-100 normalized score for the bar fill
  score: number;
};

export function computeVitals(
  oracles: Record<string, OracleState>,
  vault: VaultSnapshot | null,
): Vital[] {
  const now = Date.now();
  const fullyStated = Object.values(oracles).filter(
    (o) => o.svi && o.forward && o.expiryMs && o.expiryMs > now,
  ) as Array<{
    oracleId: string;
    svi: NonNullable<OracleState["svi"]>;
    forward: number;
    expiryMs: number;
  }>;

  return [
    btcVolVital(fullyStated),
    vaultSafetyVital(vault),
    lpProfitsVital(vault),
    surfaceHealthVital(fullyStated),
    termStructureVital(fullyStated),
  ];
}

function btcVolVital(oracles: Array<{ svi: NonNullable<OracleState["svi"]>; expiryMs: number }>): Vital {
  if (oracles.length === 0) {
    return {
      id: "vol",
      label: "BTC volatility",
      status: "Loading…",
      detail: "Waiting for surface data.",
      level: "neutral",
      score: 0,
    };
  }
  // Use shortest expiry as the indicator (most market-sensitive)
const sorted = [...oracles].sort((a, b) => a.expiryMs - b.expiryMs);
  const nowMs = Date.now();
  const T = (sorted[0].expiryMs - nowMs) / (365.25 * 24 * 3600 * 1000);
  const iv = atmIV(sorted[0].svi, T) * 100;

  let status: string;
  let detail: string;
  let level: VitalLevel;
  if (iv < 40) {
    status = "Quiet";
    detail = `BTC swinging about ±${iv.toFixed(0)}% per year — calm market.`;
    level = "good";
  } else if (iv < 80) {
    status = "Active";
    detail = `BTC at ±${iv.toFixed(0)}% annualized — normal trading conditions.`;
    level = "watch";
  } else {
    status = "Stressed";
    detail = `BTC at ±${iv.toFixed(0)}% — elevated vol, traders pricing in risk.`;
    level = "alert";
  }
  // Score: 0% IV → 0, 100% IV → 100
  const score = Math.min(100, Math.max(0, iv));
  return { id: "vol", label: "BTC volatility", status, detail, level, score };
}

function vaultSafetyVital(vault: VaultSnapshot | null): Vital {
  if (!vault) {
    return {
      id: "vault",
      label: "Vault safety",
      status: "Loading…",
      detail: "Waiting for vault state.",
      level: "neutral",
      score: 0,
    };
  }
  const ratio = vault.utilizationPct / vault.exposureCeilingPct;
  let status: string;
  let detail: string;
  let level: VitalLevel;
  if (ratio < 0.4) {
    status = "Safe";
    detail = `Vault using ${vault.utilizationPct.toFixed(2)}% of its ${vault.exposureCeilingPct.toFixed(0)}% risk budget. Tons of room.`;
    level = "good";
  } else if (ratio < 0.75) {
    status = "Stretched";
    detail = `Vault at ${vault.utilizationPct.toFixed(1)}% of ${vault.exposureCeilingPct.toFixed(0)}% cap. Manageable but watch it.`;
    level = "watch";
  } else {
    status = "At risk";
    detail = `Vault near ${vault.exposureCeilingPct.toFixed(0)}% cap. New positions may slow.`;
    level = "alert";
  }
  return {
    id: "vault",
    label: "Vault safety",
    status,
    detail,
    level,
    score: Math.min(100, ratio * 100),
  };
}

function lpProfitsVital(vault: VaultSnapshot | null): Vital {
  if (!vault) {
    return {
      id: "lp",
      label: "LP profits",
      status: "Loading…",
      detail: "Waiting for vault state.",
      level: "neutral",
      score: 0,
    };
  }
  const bps = (vault.pricePerShare - 1) * 10000;
  let status: string;
  let detail: string;
  let level: VitalLevel;
  if (bps > 5) {
    status = "LPs winning";
    detail = `Liquidity providers up ${bps.toFixed(0)} basis points. Vault is collecting more than it pays out.`;
    level = "good";
  } else if (bps > -5) {
    status = "Even";
    detail = `LPs are roughly flat — vault is balanced against position-holders.`;
    level = "watch";
  } else {
    status = "LPs losing";
    detail = `Liquidity providers down ${Math.abs(bps).toFixed(0)} bps — position-holders have been winning bets.`;
    level = "alert";
  }
  // Score: -50bps → 0, +50bps → 100
  const score = Math.min(100, Math.max(0, 50 + bps));
  return { id: "lp", label: "LP profits", status, detail, level, score };
}

function surfaceHealthVital(
  oracles: Array<{ oracleId: string; svi: NonNullable<OracleState["svi"]> }>,
): Vital {
  if (oracles.length === 0) {
    return {
      id: "surface",
      label: "Surface health",
      status: "Loading…",
      detail: "Waiting for surface data.",
      level: "neutral",
      score: 0,
    };
  }
  const violations = oracles.filter(
    (o) => checkButterfly(o.svi).severity === "violation",
  ).length;
  const total = oracles.length;
  const goodPct = ((total - violations) / total) * 100;

  let status: string;
  let detail: string;
  let level: VitalLevel;
  if (violations === 0) {
    status = "Clean";
    detail = `All ${total} live oracles produce arbitrage-free smiles.`;
    level = "good";
  } else if (violations <= total * 0.3) {
    status = "Some noise";
    detail = `${violations} of ${total} oracles show degenerate fits (usually far-dated, low-flow expiries).`;
    level = "watch";
  } else {
    status = "Degenerate";
    detail = `${violations} of ${total} oracles fail arbitrage-free conditions — surface fit quality is poor.`;
    level = "alert";
  }
  return {
    id: "surface",
    label: "Surface health",
    status,
    detail,
    level,
    score: goodPct,
  };
}

function termStructureVital(
  oracles: Array<{ svi: NonNullable<OracleState["svi"]>; expiryMs: number }>,
): Vital {
  if (oracles.length < 2) {
    return {
      id: "term",
      label: "Term structure",
      status: "Loading…",
      detail: "Need at least two expiries.",
      level: "neutral",
      score: 0,
    };
  }
const sorted = [...oracles].sort((a, b) => a.expiryMs - b.expiryMs);
  const nowMs = Date.now();
  const Tshort = (sorted[0].expiryMs - nowMs) / (365.25 * 24 * 3600 * 1000);
  const Tlong = (sorted[sorted.length - 1].expiryMs - nowMs) / (365.25 * 24 * 3600 * 1000);
  const shortIv = atmIV(sorted[0].svi, Tshort) * 100;
  const longIv = atmIV(sorted[sorted.length - 1].svi, Tlong) * 100;

  let status: string;
  let detail: string;
  let level: VitalLevel;

  if (longIv > shortIv * 1.3) {
    status = "Normal contango";
    detail = `Long-dated vol (${longIv.toFixed(0)}%) is richer than short (${shortIv.toFixed(0)}%). Healthy upward curve.`;
    level = "good";
  } else if (shortIv > longIv * 1.3) {
    status = "Stressed (inverted)";
    detail = `Short-dated vol (${shortIv.toFixed(0)}%) above long (${longIv.toFixed(0)}%). Markets pricing near-term risk.`;
    level = "alert";
  } else {
    status = "Flat";
    detail = `Short (${shortIv.toFixed(0)}%) and long (${longIv.toFixed(0)}%) vol are similar. Quiet term curve.`;
    level = "watch";
  }
  // Score: how "healthy" the upward slope is
  const ratio = longIv / Math.max(1, shortIv);
  const score = Math.min(100, Math.max(0, (ratio - 0.5) * 50));
  return { id: "term", label: "Term structure", status, detail, level, score };
}
