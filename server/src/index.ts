import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { WebSocketServer, WebSocket } from "ws";
import "dotenv/config";

const PREDICT_PACKAGE_ID =
  "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138";

const POLL_INTERVAL_MS = 3000;
const WS_PORT = Number(process.env.WS_PORT ?? 8080);

const client = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
});

// --- WebSocket fan-out ---
const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set<WebSocket>();

// Backfill cache — sent to every newly connected client so they don't wait
// for the next on-chain tick to learn about active oracles + their state.
let backfill: NormalizedEvent[] = [];

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[ws] client connected (${clients.size} total)`);
  ws.send(JSON.stringify({ type: "hello", at: Date.now() }));
  // Replay backfill so the client has full state immediately.
  for (const evt of backfill) {
    ws.send(JSON.stringify({ type: "event", data: evt }));
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

// Fetch the most recent N events of a given event type and return them
// normalized, oldest-first. Used at startup to backfill state.
async function fetchRecent(eventTypeShort: string, n: number) {
  const fullType = `${PREDICT_PACKAGE_ID}::oracle::${eventTypeShort}`;
  const res = await client.queryEvents({
    query: { MoveEventType: fullType },
    limit: n,
    order: "descending",
  });
  const out: NormalizedEvent[] = [];
  // Reverse so the freshest is last (so app state ends up reflecting the latest)
  for (let i = res.data.length - 1; i >= 0; i--) {
    const e = res.data[i];
    const tsMs = e.timestampMs ? Number(e.timestampMs) : Date.now();
    const n = normalize(e.type, e.parsedJson as Record<string, unknown>, tsMs);
    if (n) out.push(n);
  }
  return out;
}

let cursor: { txDigest: string; eventSeq: string } | null = null;

async function pollOnce() {
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
  console.log(`WebSocket server: ws://localhost:${WS_PORT}`);
  console.log(`Polling every ${POLL_INTERVAL_MS}ms\n`);

  // Backfill: load recent state for new clients so they don't start blank.
  // We want activations (for expiry), latest SVI, latest prices.
  console.log("Backfilling recent state…");
  const [activations, svis, prices] = await Promise.all([
    fetchRecent("OracleActivated", 50),
    fetchRecent("OracleSVIUpdated", 50),
    fetchRecent("OraclePricesUpdated", 50),
  ]);
  backfill = [...activations, ...svis, ...prices];
  console.log(
    `Backfill ready: ${activations.length} activated, ${svis.length} svi, ${prices.length} prices\n`,
  );

  // Seed cursor at head so we only forward NEW events from here on.
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
    pollOnce().catch((err) => console.error("[poll error]", err.message));
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
