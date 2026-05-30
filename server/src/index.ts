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

wss.on("connection", (ws) => {
  clients.add(ws);
  console.log(`[ws] client connected (${clients.size} total)`);
  ws.send(JSON.stringify({ type: "hello", at: Date.now() }));
  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[ws] client disconnected (${clients.size} total)`);
  });
  ws.on("error", () => {
    clients.delete(ws);
  });
});

function broadcast(message: object) {
  const payload = JSON.stringify(message);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}

// --- Event polling ---
let cursor: { txDigest: string; eventSeq: string } | null = null;

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
      m: { isNegative: boolean; magnitude: string };
      rho: { isNegative: boolean; magnitude: string };
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

function shortenId(id: string) {
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function normalize(eventType: string, payload: Record<string, unknown>, tsMs: number): NormalizedEvent | null {
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
        m: payload.m as { isNegative: boolean; magnitude: string },
        rho: payload.rho as { isNegative: boolean; magnitude: string },
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
    const normalized = normalize(e.type, e.parsedJson as Record<string, unknown>, tsMs);
    if (!normalized) continue;

    broadcast({ type: "event", data: normalized });

    if (normalized.kind === "prices") pricesCount++;
    else if (normalized.kind === "svi") sviCount++;
    else if (normalized.kind === "activated") activatedCount++;
    else if (normalized.kind === "settled") settledCount++;
  }

  // Compact poll-summary line
  const parts: string[] = [];
  if (pricesCount > 0) parts.push(`${pricesCount} prices`);
  if (sviCount > 0) parts.push(`${sviCount} svi`);
  if (activatedCount > 0) parts.push(`${activatedCount} activated`);
  if (settledCount > 0) parts.push(`${settledCount} settled`);
  if (parts.length > 0) {
    console.log(`[poll] ${parts.join(", ")}  → broadcast to ${clients.size} client(s)`);
  }

  if (res.nextCursor) cursor = res.nextCursor;
}

async function main() {
  console.log("VolWatch backend starting…");
  console.log("Predict package:", PREDICT_PACKAGE_ID);
  console.log(`WebSocket server: ws://localhost:${WS_PORT}`);
  console.log(`Polling every ${POLL_INTERVAL_MS}ms\n`);

  // Seed cursor at current head so we only forward NEW events.
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

// Suppress unused-var lint on shortenId — keep it for future debugging.
void shortenId;
