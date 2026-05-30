import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import "dotenv/config";

const PREDICT_PACKAGE_ID =
  "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138";

const client = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
});

async function main() {
  console.log("VolWatch backend starting…");
  console.log("Network: testnet");
  console.log("Predict package:", PREDICT_PACKAGE_ID);

  // Sanity check: can we reach testnet?
  const chainId = await client.getChainIdentifier();
  console.log("Connected. Chain identifier:", chainId);

  // Fetch recent oracle events from the Predict package
  const events = await client.queryEvents({
    query: { MoveModule: { package: PREDICT_PACKAGE_ID, module: "oracle" } },
    limit: 5,
    order: "descending",
  });
  console.log(`\nFound ${events.data.length} recent oracle events:`);
  for (const e of events.data) {
    const ts = e.timestampMs
      ? new Date(Number(e.timestampMs)).toISOString()
      : "unknown time";
    console.log("  -", e.type, "at", ts);
  }
}

main().catch((err) => {
  console.error("Backend error:", err);
  process.exit(1);
});
