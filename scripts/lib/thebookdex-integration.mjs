import { readJson, runJson, varaWalletArgs, writeJson } from "./cli.mjs";

export const THEBOOKDEX = {
  handle: "thebookdex",
  programId: "0x7fa1988c57ba1134e2461c5fb36bc13d66c1dfbf47d36c5e9960b9ca2dc0e4c4",
  idl: "integrations/thebookdex/thebook.idl",
  orderbookAsset: { ETH: null }
};

export function unwrap(value) {
  return value?.result?.ok ?? value?.result?.Ok ?? value?.result?.value ?? value?.result ?? value;
}

function tupleLength(value, index) {
  const item = Array.isArray(value) ? value[index] : undefined;
  return Array.isArray(item) ? item.length : 0;
}

export function summarizeTheBookDex({ status, orderbook, pools }) {
  const statusValue = unwrap(status);
  const orderbookValue = unwrap(orderbook);
  const poolsValue = unwrap(pools);
  const statusText = Array.isArray(statusValue)
    ? `status ${statusValue.join("/")}`
    : `status ${JSON.stringify(statusValue ?? "unknown")}`;
  const bids = tupleLength(orderbookValue, 0);
  const asks = tupleLength(orderbookValue, 1);
  const poolCount = Array.isArray(poolsValue) ? poolsValue.length : 0;

  return [
    "thebookdex DEX read",
    statusText,
    `ETH book ${bids} bids / ${asks} asks`,
    `${poolCount} AMM pools`
  ].join("; ");
}

export function runTheBookDexIntegration({ ids, agents, receiptsPath = "artifacts/deploy/thebookdex-integration-receipts.json" }) {
  const previous = readJson(receiptsPath, []);
  const existingCollab = previous.find((entry) => entry?.receipts?.signalCollab?.messageId);
  const signalCollabReceipt = existingCollab
    ? { skipped: true, reason: "thebookdex collaboration already signaled", messageId: existingCollab.receipts.signalCollab.messageId }
    : runJson("vara-wallet", varaWalletArgs([
      "call",
      THEBOOKDEX.programId,
      "Orderbook/SignalCollab",
      "--args",
      JSON.stringify([
        ids.market,
        "A2A Radar is indexing thebookdex market depth for ecosystem intelligence."
      ]),
      "--idl",
      THEBOOKDEX.idl
    ]));

  const statusReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    THEBOOKDEX.programId,
    "Orderbook/GetStatus",
    "--idl",
    THEBOOKDEX.idl
  ]));

  const orderbookReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    THEBOOKDEX.programId,
    "Orderbook/GetOrderbook",
    "--args",
    JSON.stringify([THEBOOKDEX.orderbookAsset]),
    "--idl",
    THEBOOKDEX.idl
  ]));

  const poolsReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    THEBOOKDEX.programId,
    "Amm/ListPools",
    "--idl",
    THEBOOKDEX.idl
  ]));

  const summary = summarizeTheBookDex({
    status: statusReceipt,
    orderbook: orderbookReceipt,
    pools: poolsReceipt
  });

  const coreReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    ids.core,
    "Core/IngestEvent",
    "--args",
    JSON.stringify(["ProviderResponse", THEBOOKDEX.programId, "Marketplace", null, 3, summary]),
    "--idl",
    agents.core.idl
  ]));

  const broadcastReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    ids.broadcast,
    "Broadcast/AnnounceIntegration",
    "--args",
    JSON.stringify([THEBOOKDEX.programId, summary]),
    "--idl",
    agents.broadcast.idl
  ]));

  const entry = {
    observedAt: new Date().toISOString(),
    partner: THEBOOKDEX,
    summary,
    receipts: {
      signalCollab: signalCollabReceipt,
      status: statusReceipt,
      orderbook: orderbookReceipt,
      pools: poolsReceipt,
      coreIngest: coreReceipt,
      broadcastAnnounce: broadcastReceipt
    }
  };
  writeJson(receiptsPath, [...previous, entry].slice(-50));
  return entry;
}
