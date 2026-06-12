// Classifies the shape of a vol smile from its SVI parameters.
// Uses rho (the SVI correlation/skew parameter) and b (slope) to decide.
//
// Heuristics (industry-standard but not exhaustive):
//   - |rho| < 0.15  → roughly symmetric → SMILE
//   - rho <= -0.5   → heavy left wing, puts pricier → SKEW (crash)
//   - rho >=  0.5   → heavy right wing, calls pricier → SKEW (rally)
//   - otherwise asymmetric but not extreme → SMIRK

import type { SVIParams } from "./svi";

export type SmileShape = {
  label: "SMILE" | "SKEW" | "SMIRK";
  variant?: "crash" | "rally";
  tone: "neutral" | "red" | "emerald" | "amber";
  description: string;
};

export function classifySmile(svi: SVIParams): SmileShape {
  const rho = svi.rho;

  if (Math.abs(rho) < 0.15) {
    return {
      label: "SMILE",
      tone: "neutral",
      description: "Roughly symmetric. Calls and puts priced similarly off ATM.",
    };
  }

  if (rho <= -0.5) {
    return {
      label: "SKEW",
      variant: "crash",
      tone: "red",
      description: "Crash skew. Puts substantially pricier than calls. Market hedging downside.",
    };
  }

  if (rho >= 0.5) {
    return {
      label: "SKEW",
      variant: "rally",
      tone: "emerald",
      description: "Rally skew. Calls substantially pricier than puts. Market positioned for upside.",
    };
  }

  // -0.5 < rho < 0.5 and |rho| >= 0.15 → asymmetric but not extreme
  return {
    label: "SMIRK",
    variant: rho < 0 ? "crash" : "rally",
    tone: "amber",
    description: rho < 0
      ? "Slight crash tilt. One wing heavier than the other but not extreme."
      : "Slight rally tilt. One wing heavier than the other but not extreme.",
  };
}
