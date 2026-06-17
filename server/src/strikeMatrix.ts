import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

// Predict's internal scaling for strike prices (1e9 fixed-point)
const STRIKE_SCALE = 1e9;
// Notional quantities in Predict are denominated in 1e6 base units (matching dUSDC decimals)
const NOTIONAL_SCALE = 1e6;

export type StrikeBin = {
  // Strike midpoint for this bin (USD)
  strikeMid: number;
  // Total call/up notional written in this bin (USD-ish notional, base units / NOTIONAL_SCALE)
  notionalUp: number;
  // Total put/dn notional written in this bin
  notionalDn: number;
  // Net exposure: positive = vault is short more calls than puts in this bin
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

/**
 * Walk the oracle_matrices Table and fetch every StrikeMatrix.
 * Returns aggregated exposure data per oracle.
 *
 * Performance: 22 oracles, paginated dynamic field walk, then individual
 * object fetches per matrix. Aim to refresh every 30s, not every 5s.
 */
export async function fetchExposureSnapshot(
  client: SuiJsonRpcClient,
  oracleMatricesTableId: string,
): Promise<ExposureSnapshot> {
  const oracles: OracleExposure[] = [];

  let cursor: string | null | undefined = null;
  let safetyCounter = 0;

  while (safetyCounter++ < 10) {
    const page: any = await client.getDynamicFields({
      parentId: oracleMatricesTableId,
      cursor: cursor ?? undefined,
      limit: 50,
    });

    // Each entry's `name.value` is the oracle ID (this is how the Table is keyed)
    // The dynamic field object itself wraps the StrikeMatrix
    for (const entry of page.data ?? []) {
      const oracleId = String(entry.name?.value ?? "");
      const fieldObjId = entry.objectId;
      if (!oracleId || !fieldObjId) continue;

      try {
        const [fieldObj, oracleObj]: any[] = await Promise.all([
          client.getObject({ id: fieldObjId, options: { showContent: true } }),
          client.getObject({ id: oracleId, options: { showContent: true } }),
        ]);
        const value = fieldObj?.data?.content?.fields?.value?.fields;
        if (!value) continue;
        // Pull expiry from the oracle object directly. Fallback: skip.
        const expiryStr = oracleObj?.data?.content?.fields?.expiry;
        const expiryMs = expiryStr ? Number(expiryStr) : undefined;

        const minStrike = Number(value.min_strike) / STRIKE_SCALE;
        const maxStrike = Number(value.max_strike) / STRIKE_SCALE;
        const mintedMinStrike = Number(value.minted_min_strike) / STRIKE_SCALE;
        const mintedMaxStrike = Number(value.minted_max_strike) / STRIKE_SCALE;
        const mtm = Number(value.mtm) / NOTIONAL_SCALE;
        const pageTree: any[] = Array.isArray(value.page_tree) ? value.page_tree : [];

        // The page_tree is a segment tree. Leaves are at the END of the array.
        // For a tree with N pages, the leaves are the latter half.
        // Without knowing the protocol's tree shape exactly, we conservatively
        // treat all entries as bins and let the leaf detection happen by
        // taking the second half (standard segment tree layout).
        const treeLen = pageTree.length;
        const leafStart = Math.floor(treeLen / 2);
        const leafCount = treeLen - leafStart;
        const leaves = pageTree.slice(leafStart);

        const bins: StrikeBin[] = [];
        let totalUp = 0;
        let totalDn = 0;

        // Map each leaf bin to a strike midpoint within [minStrike, maxStrike]
        if (leafCount > 0 && maxStrike > minStrike) {
          const stride = (maxStrike - minStrike) / leafCount;
          for (let i = 0; i < leafCount; i++) {
            const leaf = leaves[i]?.fields ?? {};
            const notionalUp = Number(leaf.total_q_up ?? 0) / NOTIONAL_SCALE;
            const notionalDn = Number(leaf.total_q_dn ?? 0) / NOTIONAL_SCALE;
            const strikeMid = minStrike + stride * (i + 0.5);
            const net = notionalUp - notionalDn;
            // Skip empty bins to keep payload small
            if (notionalUp === 0 && notionalDn === 0) continue;
            bins.push({ strikeMid, notionalUp, notionalDn, net });
            totalUp += notionalUp;
            totalDn += notionalDn;
          }
        }

       oracles.push({
          oracleId,
          expiryMs,
          minStrike,
          maxStrike,
          mintedMinStrike,
          mintedMaxStrike,
          mtm,
          bins,
          totalUp,
          totalDn,
        });

      } catch (err) {
        // Single matrix failure shouldn't break the whole snapshot
        console.warn(`[exposure] failed to read matrix ${fieldObjId}:`, (err as Error).message);
      }
    }

    if (!page.hasNextPage) break;
    cursor = page.nextCursor;
  }

  return {
    ts: Date.now(),
    oracles,
  };
}