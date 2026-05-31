import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";

const client = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl("testnet"),
  network: "testnet",
});

const PREDICT_OBJECT_ID =
  "0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a";

const res = await client.getObject({
  id: PREDICT_OBJECT_ID,
  options: { showContent: true, showType: true },
});

console.log(JSON.stringify(res, null, 2).slice(0, 6000));
