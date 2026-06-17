// Deterministic surface explainer.
//
// Given the current oracle state, vault state, and arb-check results,
// emit plain-English observations a trader would care about. Each observation
// has a severity so the UI can highlight what matters.

import { OracleState, VaultSnapshot } from "./useVolStream";
import { atmIV } from "./svi";
import { checkButterfly, checkAllCalendars } from "./arbitrage";
import { shortId } from "./format";

export type Observation = {
  severity: "info" | "notable" | "warning" | "alert";
  title: string;
  detail: string;
};

export function explainSurface(
  oracles: Record<string, OracleState>,
  vault: VaultSnapshot | null,
  latestSpot: number | null,
): Observation[] {
  const out: Observation[] = [];
  const now = Date.now();

  // 1. Spot summary
  if (latestSpot !== null) {
    out.push({
      severity: "info",
      title: `BTC trading around $${latestSpot.toLocaleString("en-US", { maximumFractionDigits: 0 })}`,
      detail: `Live spot from Predict's oracle feed.`,
    });
  }

  // Collect fully-stated active oracles
  const fullyStated = Object.values(oracles).filter(
    (o) => o.svi && o.forward && o.expiryMs && o.expiryMs > now,
  ) as Array<{
    oracleId: string;
    svi: NonNullable<OracleState["svi"]>;
    forward: number;
    expiryMs: number;
  }>;

  // 2. Term structure
  if (fullyStated.length >= 2) {
    const sorted = [...fullyStated].sort(
      (a, b) => a.expiryMs - b.expiryMs,
    );
    const shortest = sorted[0];
    const longest = sorted[sorted.length - 1];
   const Tshort = (shortest.expiryMs - now) / (365.25 * 24 * 3600 * 1000);
    const Tlong = (longest.expiryMs - now) / (365.25 * 24 * 3600 * 1000);
    const shortIv = atmIV(shortest.svi, Tshort) * 100;
    const longIv = atmIV(longest.svi, Tlong) * 100;
    const shortMins = Math.round(
      (shortest.expiryMs - now) / 60000,
    );
    const longMins = Math.round((longest.expiryMs - now) / 60000);

    if (longIv > shortIv * 1.5) {
      out.push({
        severity: "notable",
        title: "Upward term structure (contango)",
        detail: `Short-dated (${shortMins}m) ATM vol is ${shortIv.toFixed(0)}%, long-dated (${longMins}m) is ${longIv.toFixed(0)}%. Longer expiries are richer — buyers paying for time uncertainty.`,
      });
    } else if (shortIv > longIv * 1.5) {
      out.push({
        severity: "warning",
        title: "Inverted term structure (backwardation)",
        detail: `Short-dated (${shortMins}m) vol at ${shortIv.toFixed(0)}% is well above long-dated (${longMins}m) at ${longIv.toFixed(0)}%. Classic near-term stress signal — event risk priced in.`,
      });
    } else {
      out.push({
        severity: "info",
        title: "Flat term structure",
        detail: `ATM vol is similar across the curve (${shortIv.toFixed(0)}% short → ${longIv.toFixed(0)}% long). Quiet regime — no near-term event risk being priced.`,
      });
    }
  }

  // 3. Skew sign (using nearest-dated oracle as the reference)
  if (fullyStated.length > 0) {
    const sorted = [...fullyStated].sort(
      (a, b) => a.expiryMs - b.expiryMs,
    );
    const ref = sorted[0];
    const rho = ref.svi.rho;
    if (rho < -0.5) {
      out.push({
        severity: "notable",
        title: "Strong crash skew (puts richer)",
        detail: `Nearest-expiry ρ = ${rho.toFixed(2)} — downside protection is meaningfully more expensive than upside calls. Classic BTC behavior.`,
      });
    } else if (rho > 0.3) {
      out.push({
        severity: "warning",
        title: "Right-skew detected (calls richer)",
        detail: `Nearest-expiry ρ = ${rho.toFixed(2)} — upside calls priced above downside puts. Unusual for BTC — could indicate squeezed positioning or a known upside catalyst.`,
      });
    }
  }

  // 4. Arb violations
  const butterflyViolations = fullyStated
    .map((o) => ({ o, c: checkButterfly(o.svi) }))
    .filter((x) => x.c.severity === "violation");
  if (butterflyViolations.length > 0) {
    const ids = butterflyViolations
      .slice(0, 3)
      .map((v) => shortId(v.o.oracleId))
      .join(", ");
    out.push({
      severity: "alert",
      title: `${butterflyViolations.length} butterfly arb violation${butterflyViolations.length > 1 ? "s" : ""} detected`,
      detail: `Oracle${butterflyViolations.length > 1 ? "s" : ""} ${ids} show${butterflyViolations.length > 1 ? "" : "s"} locally concave smile shape. Typically caused by degenerate SVI fit on a far-dated or low-flow expiry — not a tradable opportunity, but a real data-quality signal.`,
    });
  }

  const calendars = checkAllCalendars(
    fullyStated.map((o) => ({
      oracleId: o.oracleId,
      svi: o.svi,
      expiryMs: o.expiryMs,
      forward: o.forward,
    })),
  );
  const calendarViolations = calendars.filter(
    (c) => c.severity === "violation",
  );
  if (calendarViolations.length > 0) {
    out.push({
      severity: "alert",
      title: `${calendarViolations.length} calendar arb violation${calendarViolations.length > 1 ? "s" : ""} detected`,
      detail: `Short-dated total variance exceeds long-dated at some strike — a static calendar arbitrage exists on paper. On testnet this almost always reflects fit noise, not real opportunity.`,
    });
  }

  // 5. Vault state commentary
  if (vault) {
    if (vault.utilizationPct < 1) {
      out.push({
        severity: "info",
        title: "PLP vault deeply under-utilized",
        detail: `Utilization at ${vault.utilizationPct.toFixed(2)}% vs ${vault.exposureCeilingPct.toFixed(0)}% cap. Vault has ~${vault.headroomPct.toFixed(0)}% of headroom — plenty of capacity to absorb new positions.`,
      });
    } else if (vault.utilizationPct > vault.exposureCeilingPct * 0.7) {
      out.push({
        severity: "warning",
        title: "PLP vault approaching exposure cap",
        detail: `Utilization at ${vault.utilizationPct.toFixed(2)}% of ${vault.exposureCeilingPct.toFixed(0)}% cap. Protocol may slow new position acceptance — watch headroom (${vault.headroomPct.toFixed(2)}% remaining).`,
      });
    }

    if (vault.pricePerShare > 1.001) {
      const bps = (vault.pricePerShare - 1) * 10000;
      out.push({
        severity: "info",
        title: `LPs are up ${bps.toFixed(0)} bps`,
        detail: `NAV per PLP share at $${vault.pricePerShare.toFixed(4)} vs $1.00 starting basis. Vault has been winning against position-holders so far.`,
      });
    } else if (vault.pricePerShare < 0.999) {
      const bps = (1 - vault.pricePerShare) * 10000;
      out.push({
        severity: "warning",
        title: `LPs underwater by ${bps.toFixed(0)} bps`,
        detail: `NAV per PLP share at $${vault.pricePerShare.toFixed(4)} — vault has paid out more than it's collected so far.`,
      });
    }

    if (vault.tradingPaused) {
      out.push({
        severity: "alert",
        title: "Trading paused",
        detail: "Protocol has halted new positions — no new oracle exposure being written.",
      });
    }

    if (vault.withdrawalLimiter.enabled) {
      out.push({
        severity: "warning",
        title: "Withdrawal limiter active",
        detail: `Rate limiter is on with ${vault.withdrawalLimiter.available.toFixed(0)} available of ${vault.withdrawalLimiter.capacity.toFixed(0)} capacity. LP withdrawals are throttled.`,
      });
    }
  }

  return out;
}
