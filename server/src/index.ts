import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import "dotenv/config";

const PREDICT_PACKAGE_ID =
  "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138";

const POLL_INTERVAL_MS = 3000; // poll every 3s

const client = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
});

// Track the latest event we've seen so we only log new ones.
// Sui event cursors are { txDigest, eventSeq }.
let cursor: { txDigest: string; eventSeq: string } | null = null;

async function pollOnce() {
  const res = await client.queryEvents({
    query: { MoveModule: { package: PREDICT_PACKAGE_ID, module: "oracle" } },
    cursor: cursor ?? null,
    limit: 50,
    order: "ascending",
  });

  if (res.data.length === 0) return;

  for (const e of res.data) {
    const shortType = e.type.split("::").slice(-1)[0];
    const ts = e.timestampMs
      ? new Date(Number(e.timestampMs)).toISOString()
      : "?";
    const payload = e.parsedJson as Record<string, unknown>;

    // Compact log: type + key fields
    if (shortType === "OraclePricesUpdated") {
      const spotScaled = Number(payload.spot) / 1e9;
      console.log(
        `[${ts}] PricesUpdated  spot=$${spotScaled.toFixed(2)}  oracle=${shortenId(payload.oracle_id as string)}`,
      );
    } else if (shortType === "OracleSVIUpdated") {
      console.log(
        `[${ts}] SVIUpdated     a=${payload.a} b=${payload.b} sigma=${payload.sigma}  oracle=${shortenId(payload.oracle_id as string)}`,
      );
    } else if (shortType === "OracleActivated") {
      const expiry = new Date(Number(payload.expiry)).toISOString();
      console.log(
        `[${ts}] Activated      expiry=${expiry}  oracle=${shortenId(payload.oracle_id as string)}`,
      );
    } else if (shortType === "OracleSettled") {
      const price = Number(payload.settlement_price) / 1e9;
      console.log(
        `[${ts}] Settled        price=$${price.toFixed(2)}  oracle=${shortenId(payload.oracle_id as string)}`,
      );
    } else {
      console.log(`[${ts}] ${shortType}  ${JSON.stringify(payload)}`);
    }
  }

  // Move the cursor forward so next poll only fetches new events.
  if (res.nextCursor) {
    cursor = res.nextCursor;
  }
}

function shortenId(id: string) {
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

async function main() {
  console.log("VolWatch backend starting…");
  console.log("Predict package:", PREDICT_PACKAGE_ID);
  console.log(`Polling every ${POLL_INTERVAL_MS}ms\n`);

  // Prime the cursor by reading current latest event without logging it,
  // so we only log NEW events from this point forward.
  const seed = await client.queryEvents({
    query: { MoveModule: { package: PREDICT_PACKAGE_ID, module: "oracle" } },
    limit: 1,
    order: "descending",
  });
  if (seed.data.length > 0) {
    cursor = { txDigest: seed.data[0].id.txDigest, eventSeq: seed.data[0].id.eventSeq };
    console.log("Caught up. Watching for new events…\n");
  } else {
    console.log("No prior events. Watching from scratch…\n");
  }

  // Poll loop
  setInterval(() => {
    pollOnce().catch((err) => console.error("Poll error:", err.message));
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("Backend startup error:", err);
  process.exit(1);
});
