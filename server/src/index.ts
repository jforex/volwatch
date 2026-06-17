import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import "dotenv/config";
import { fetchExposureSnapshot, type ExposureSnapshot } from "./strikeMatrix.js";

const PREDICT_PACKAGE_ID =
  "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138";
const PREDICT_OBJECT_ID =
  "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a";

const POLL_INTERVAL_MS = 3000;
const VAULT_POLL_INTERVAL_MS = 10_000;
const WS_PORT = Number(process.env.PORT ?? process.env.WS_PORT ?? 8080);

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

const httpServer = createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("VolWatch server live");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });
const clients = new Set<WebSocket>();

let backfill: NormalizedEvent[] = [];
let latestVault: VaultSnapshot | null = null;
let oracleMatricesTableId: string | null = null;
let latestExposure: ExposureSnapshot | null = null;

// Time-travel: rolling snapshot history of oracle state + vault, last 30 min, sampled every 5s
type OracleSnapshot = {
  oracleId: string;
  expiryMs?: number;
  forward?: number;
  svi?: {
    a: string;
    b: string;
    m: { is_negative: boolean; magnitude: string };
    rho: { is_negative: boolean; magnitude: string };
    sigma: string;
  };
};
type HistoryFrame = {
  ts: number;
  oracles: OracleSnapshot[];
  vault: VaultSnapshot | null;
};
const HISTORY_WINDOW_MS = 30 * 60 * 1000; // 30 min
const HISTORY_SAMPLE_MS = 5_000; // sample every 5s
let history: HistoryFrame[] = [];
// Server-side oracle state (mirrors what the frontend builds, used to capture snapshots)
const serverOracles: Record<string, OracleSnapshot> = {};


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
  // Time-travel: send history buffer so client can scrub backwards
  if (history.length > 0) {
    ws.send(JSON.stringify({ type: "history", data: history }));
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
    // Cache the oracle_matrices table ID so the exposure poller can walk it
    const omId = f.vault.fields.oracle_matrices.fields.id?.id;
    if (omId && typeof omId === "string") {
      oracleMatricesTableId = omId;
    }
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
    // Mirror oracle state server-side for snapshot capture
    if (normalized.kind === "prices") {
      const o = serverOracles[normalized.oracleId] ?? { oracleId: normalized.oracleId };
      o.forward = normalized.forward;
      serverOracles[normalized.oracleId] = o;
    } else if (normalized.kind === "svi") {
      const o = serverOracles[normalized.oracleId] ?? { oracleId: normalized.oracleId };
      o.svi = {
        a: normalized.a,
        b: normalized.b,
        m: normalized.m,
        rho: normalized.rho,
        sigma: normalized.sigma,
      };
      serverOracles[normalized.oracleId] = o;
    } else if (normalized.kind === "activated") {
      const o = serverOracles[normalized.oracleId] ?? { oracleId: normalized.oracleId };
      o.expiryMs = normalized.expiryMs;
      serverOracles[normalized.oracleId] = o;
    }
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

  // Exposure (strike-matrix walk) — slow, every 30s. Independent of vault polling.
  const EXPOSURE_POLL_INTERVAL_MS = 30_000;
 setInterval(async () => {
    if (!oracleMatricesTableId) return;
    try {
    const snap = await fetchExposureSnapshot(client as any, oracleMatricesTableId);
      // Reverse-sync: write expiries from on-chain exposure data back into serverOracles
      // so history frames pick them up. The exposure walker fetches each oracle's expiry directly from chain.
      for (const o of snap.oracles) {
        if (o.expiryMs) {
          const cached = serverOracles[o.oracleId] ?? { oracleId: o.oracleId };
          cached.expiryMs = o.expiryMs;
          serverOracles[o.oracleId] = cached;
        }
      }
      latestExposure = snap;
      const totalOracles = snap.oracles.length;

      const totalBins = snap.oracles.reduce((sum, o) => sum + o.bins.length, 0);
      console.log(`[exposure] ${totalOracles} oracles · ${totalBins} active bins (broadcasting…)`);
      try {
        const payload = JSON.stringify({ type: "exposure", data: snap });
        console.log(`[exposure] payload size: ${payload.length} bytes`);
        for (const ws of clients) {
          if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        }
        console.log(`[exposure] broadcast to ${clients.size} client(s) OK`);
      } catch (serErr: any) {
        console.error("[exposure SERIALIZE/SEND error]", serErr.message);
      }
    } catch (err: any) {
      console.error("[exposure poll error]", err.message);
      console.error(err.stack);
    }
  }, EXPOSURE_POLL_INTERVAL_MS);

  // Time-travel: capture a snapshot every 5s, trim to 30 min window
  setInterval(() => {
    const now = Date.now();
    const frame: HistoryFrame = {
      ts: now,
      oracles: Object.values(serverOracles).map((o) => ({ ...o })),
      vault: latestVault ? { ...latestVault } : null,
    };
    history.push(frame);
    const cutoff = now - HISTORY_WINDOW_MS;
    while (history.length > 0 && history[0].ts < cutoff) {
      history.shift();
    }
    // Broadcast latest frame so connected clients get rolling updates
    broadcast({ type: "history-frame", data: frame });
  }, HISTORY_SAMPLE_MS);
  

  httpServer.listen(WS_PORT, "0.0.0.0", () => {
    console.log(`VolWatch server listening on 0.0.0.0:${WS_PORT}`);
  });
}

main().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});