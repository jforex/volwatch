import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import "dotenv/config";

const PREDICT_PACKAGE_ID =
  "0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138";

const EVENT_TYPES = [
  "OraclePricesUpdated",
  "OracleSVIUpdated",
  "OracleSettled",
  "OracleActivated",
] as const;

const client = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
});

async function main() {
  console.log("VolWatch backend starting…");
  console.log("Predict package:", PREDICT_PACKAGE_ID, "\n");

  for (const name of EVENT_TYPES) {
    const fullType = `${PREDICT_PACKAGE_ID}::oracle::${name}`;
    const res = await client.queryEvents({
      query: { MoveEventType: fullType },
      limit: 1,
      order: "descending",
    });

    console.log(`--- ${name} (${res.data.length} found) ---`);
    if (res.data.length > 0) {
      const e = res.data[0];
      const ts = e.timestampMs
        ? new Date(Number(e.timestampMs)).toISOString()
        : "unknown";
      console.log(`  Latest at: ${ts}`);
      console.log(`  Payload:`);
      console.log(
        JSON.stringify(e.parsedJson, null, 2)
          .split("\n")
          .map((l) => "    " + l)
          .join("\n"),
      );
    } else {
      console.log("  (no events yet — oracle type not yet in use)");
    }
    console.log();
  }
}

main().catch((err) => {
  console.error("Backend error:", err);
  process.exit(1);
});
