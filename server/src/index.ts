import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { WebSocketServer, WebSocket } from "ws";
import "dotenv/config";

const PREDICT_PACKAGE_ID =
  "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138";
const PREDICT_OBJECT_ID =
  "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a";

const POLL_INTERVAL_MS = 3000;
const VAULT_POLL_INTERVAL_MS = 10_000;
const WS_PORT = Number(process.env.WS_PORT ?? 8080);

// dUSDC has 6 decimals
const QUOTE_DECIMALS = 1e6;
// PLP supply uses same scale
const PLP_DECIMALS = 1e6;
// Risk config and rate limiter scales (1e9 fixed point used widely in Predict)
const PCT_SCALE = 1e9;

const client = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
});

const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set<WebSocket>();

let backfill: NormalizedEvent[] = [];
let latestVault: VaultSnapshot | null = null;

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[ws] client connected (${clients.size} total)`);
  ws.send(JSON.stringify({ type: "hello", at: Date.now() }));
  for (const evt of backfill) {
    ws.send(JSON.stringify({ type: "event", data: evt }));
  }
  if (latestVault) {
    ws.send(JSON.stringify({ type: "vault", data: latestVault }));
  }
  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[ws] client disconnected (${clients.size} total)`);
  });
  ws.on("error", () => clients.delete(ws));
});

function broadcast(message: object) {
  const payload = JSON.stringify(message);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

type NormalizedEvent =
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

export type VaultSnapshot = {
  ts: number;
  vaultBalance: number; // USD
  plpSupply: number; // shares
  pricePerShare: number; // USD per share
  totalMaxPayout: number; // USD
  totalMTM: number; // USD
  utilizationPct: number; // 0–100
  exposureCeilingPct: number; // protocol-defined cap, 0–100
  headroomPct: number; // ceiling - utilization
  activeStrikeMatrices: number;
  settledOraclesCount: number;
  tradingPaused: boolean;
  withdrawalLimiter: {
    enabled: boolean;
    available: number;
    capacity: number;
  };
};

function normalize(
  eventType: string,
  payload: Record<string, unknown>,
  tsMs: number,
): NormalizedEvent | null {
  const shortType = eventType.split("::").slice(-1)[0];
  switch (shortType) {
    case "OraclePricesUpdated":
      return {
        kind: "prices",
        oracleId: String(payload.oracle_id),
        spot: Number(payload.spot) / 1e9,
        forward: Number(payload.forward) / 1e9,
        ts: tsMs,
      };
    case "OracleSVIUpdated":
      return {
        kind: "svi",
        oracleId: String(payload.oracle_id),
        a: String(payload.a),
        b: String(payload.b),
        m: payload.m as { is_negative: boolean; magnitude: string },
        rho: payload.rho as { is_negative: boolean; magnitude: string },
        sigma: String(payload.sigma),
        ts: tsMs,
      };
    case "OracleActivated":
      return {
        kind: "activated",
        oracleId: String(payload.oracle_id),
        expiryMs: Number(payload.expiry),
        ts: tsMs,
      };
    case "OracleSettled":
      return {
        kind: "settled",
        oracleId: String(payload.oracle_id),
        settlementPrice: Number(payload.settlement_price) / 1e9,
        expiryMs: Number(payload.expiry),
        ts: tsMs,
      };
    default:
      return null;
  }
}

async function fetchRecent(eventTypeShort: string, n: number) {
  const fullType = `${PREDICT_PACKAGE_ID}::oracle::${eventTypeShort}`;
  const res = await client.queryEvents({
    query: { MoveEventType: fullType },
    limit: n,
    order: "descending",
  });
  const out: NormalizedEvent[] = [];
  for (let i = res.data.length - 1; i >= 0; i--) {
    const e = res.data[i];
    const tsMs = e.timestampMs ? Number(e.timestampMs) : Date.now();
    const n = normalize(e.type, e.parsedJson as Record<string, unknown>, tsMs);
    if (n) out.push(n);
  }
  return out;
}

async function pollVault(): Promise<VaultSnapshot | null> {
  try {
    const res = await client.getObject({
      id: PREDICT_OBJECT_ID,
      options: { showContent: true },
    });
    // Type narrowing is messy here — Sui SDK returns a complex union. Walk it.
    const content = (res as any)?.data?.content;
    if (!content || content.dataType !== "moveObject") return null;
    const f = content.fields;

    const vaultBalance = Number(f.vault.fields.balance) / QUOTE_DECIMALS;
    const plpSupply =
      Number(f.treasury_cap.fields.total_supply.fields.value) / PLP_DECIMALS;
    const pricePerShare = plpSupply > 0 ? vaultBalance / plpSupply : 0;
    const totalMaxPayout = Number(f.vault.fields.total_max_payout) / QUOTE_DECIMALS;
    const totalMTM = Number(f.vault.fields.total_mtm) / QUOTE_DECIMALS;
    const utilizationPct =
      vaultBalance > 0 ? (totalMaxPayout / vaultBalance) * 100 : 0;
    const exposureCeilingPct =
      Number(f.risk_config.fields.max_total_exposure_pct) / PCT_SCALE * 100;
    const headroomPct = exposureCeilingPct - utilizationPct;
    const activeStrikeMatrices = Number(
      f.vault.fields.oracle_matrices.fields.size ?? 0,
    );
    const settledOraclesCount = Number(
      f.vault.fields.settled_oracles.fields.size ?? 0,
    );
    const tradingPaused = !!f.trading_paused;
    const wl = f.withdrawal_limiter.fields;

    return {
      ts: Date.now(),
      vaultBalance,
      plpSupply,
      pricePerShare,
      totalMaxPayout,
      totalMTM,
      utilizationPct,
      exposureCeilingPct,
      headroomPct,
      activeStrikeMatrices,
      settledOraclesCount,
      tradingPaused,
      withdrawalLimiter: {
        enabled: !!wl.enabled,
        available: Number(wl.available) / QUOTE_DECIMALS,
        capacity: Number(wl.capacity) / QUOTE_DECIMALS,
      },
    };
  } catch (err: any) {
    console.error("[vault poll error]", err.message);
    return null;
  }
}

let cursor: { txDigest: string; eventSeq: string } | null = null;

async function pollEvents() {
  const res = await client.queryEvents({
    query: { MoveModule: { package: PREDICT_PACKAGE_ID, module: "oracle" } },
    cursor: cursor ?? null,
    limit: 50,
    order: "ascending",
  });
  if (res.data.length === 0) return;

  let pricesCount = 0;
  let sviCount = 0;
  let activatedCount = 0;
  let settledCount = 0;

  for (const e of res.data) {
    const tsMs = e.timestampMs ? Number(e.timestampMs) : Date.now();
    const normalized = normalize(
      e.type,
      e.parsedJson as Record<string, unknown>,
      tsMs,
    );
    if (!normalized) continue;
    broadcast({ type: "event", data: normalized });
    if (normalized.kind === "prices") pricesCount++;
    else if (normalized.kind === "svi") sviCount++;
    else if (normalized.kind === "activated") activatedCount++;
    else if (normalized.kind === "settled") settledCount++;
  }

  const parts: string[] = [];
  if (pricesCount) parts.push(`${pricesCount} prices`);
  if (sviCount) parts.push(`${sviCount} svi`);
  if (activatedCount) parts.push(`${activatedCount} activated`);
  if (settledCount) parts.push(`${settledCount} settled`);
  if (parts.length > 0) {
    console.log(
      `[poll] ${parts.join(", ")}  → broadcast to ${clients.size} client(s)`,
    );
  }

  if (res.nextCursor) cursor = res.nextCursor;
}

async function main() {
  console.log("VolWatch backend starting…");
  console.log("Predict package:", PREDICT_PACKAGE_ID);
  console.log("Predict object:", PREDICT_OBJECT_ID);
  console.log(`WebSocket server: ws://localhost:${WS_PORT}`);
  console.log(`Event poll: ${POLL_INTERVAL_MS}ms · Vault poll: ${VAULT_POLL_INTERVAL_MS}ms\n`);

  console.log("Backfilling recent state…");
  const [activations, svis, prices] = await Promise.all([
    fetchRecent("OracleActivated", 50),
    fetchRecent("OracleSVIUpdated", 50),
    fetchRecent("OraclePricesUpdated", 50),
  ]);
  backfill = [...activations, ...svis, ...prices];
  console.log(
    `Backfill ready: ${activations.length} activated, ${svis.length} svi, ${prices.length} prices`,
  );

  console.log("Initial vault snapshot…");
  latestVault = await pollVault();
  if (latestVault) {
    console.log(
      `Vault: $${latestVault.vaultBalance.toFixed(2)} · PLP $${latestVault.pricePerShare.toFixed(4)} · util ${latestVault.utilizationPct.toFixed(2)}%\n`,
    );
  }

  const seed = await client.queryEvents({
    query: { MoveModule: { package: PREDICT_PACKAGE_ID, module: "oracle" } },
    limit: 1,
    order: "descending",
  });
  if (seed.data.length > 0) {
    cursor = {
      txDigest: seed.data[0].id.txDigest,
      eventSeq: seed.data[0].id.eventSeq,
    };
    console.log("Caught up. Watching for new events…\n");
  }

  setInterval(() => {
    pollEvents().catch((err) => console.error("[poll error]", err.message));
  }, POLL_INTERVAL_MS);

  setInterval(async () => {
    const snap = await pollVault();
    if (snap) {
      latestVault = snap;
      broadcast({ type: "vault", data: snap });
      console.log(
        `[vault] $${snap.vaultBalance.toFixed(2)} · util ${snap.utilizationPct.toFixed(2)}% · payout $${snap.totalMaxPayout.toFixed(2)}`,
      );
    }
  }, VAULT_POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
