import { readJson, runJson, varaWalletArgs, writeJson } from "./cli.mjs";

export const VARABRIDGE = {
  handle: "varabridge",
  programId: "0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4",
  idl: "integrations/vara-trinity/vara_bridge.idl",
  query: { query_type: "all", symbol: null, keys: null }
};

export function unwrap(value) {
  return value?.result?.ok ?? value?.result?.Ok ?? value?.result ?? value;
}

export function summarizeBridgeReply(reply) {
  const value = reply?.value ?? reply?.All ?? reply;
  const prices = value?.prices ?? [];
  const markets = value?.markets ?? [];
  const news = value?.news ?? [];
  const gas = value?.gas;
  const datetime = value?.datetime;
  const btc = prices.find((entry) => entry.key === "BTC")?.value;
  const eth = prices.find((entry) => entry.key === "ETH")?.value;
  const bits = [
    `VaraBridge oracle read: ${prices.length} prices, ${markets.length} markets, ${news.length} news items`,
    btc ? `BTC ${btc.price_usd_micro} microUSD (${btc.change_24h_bps} bps)` : undefined,
    eth ? `ETH ${eth.price_usd_micro} microUSD (${eth.change_24h_bps} bps)` : undefined,
    gas ? `gas ${gas.current_fee_micro} micro` : undefined,
    datetime ? `time ${datetime.utc_string}` : undefined
  ].filter(Boolean);
  return bits.join("; ");
}

export function runVaraBridgeIntegration({ ids, agents, receiptsPath = "artifacts/deploy/varabridge-integration-receipts.json" }) {
  const bridgeReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    VARABRIDGE.programId,
    "VaraBridge/QueryAndReply",
    "--args",
    JSON.stringify([VARABRIDGE.query]),
    "--idl",
    VARABRIDGE.idl
  ]));
  const bridgeReply = unwrap(bridgeReceipt);
  const summary = summarizeBridgeReply(bridgeReply);

  const coreReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    ids.core,
    "Core/IngestEvent",
    "--args",
    JSON.stringify(["ProviderResponse", VARABRIDGE.programId, "Oracle", null, 3, summary]),
    "--idl",
    agents.core.idl
  ]));

  const broadcastReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    ids.broadcast,
    "Broadcast/AnnounceIntegration",
    "--args",
    JSON.stringify([VARABRIDGE.programId, summary]),
    "--idl",
    agents.broadcast.idl
  ]));

  const entry = {
    observedAt: new Date().toISOString(),
    partner: VARABRIDGE,
    summary,
    receipts: {
      varaBridgeQuery: bridgeReceipt,
      coreIngest: coreReceipt,
      broadcastAnnounce: broadcastReceipt
    }
  };
  const previous = readJson(receiptsPath, []);
  writeJson(receiptsPath, [...previous, entry].slice(-50));
  return entry;
}
