import { readJson, runJson, varaWalletArgs, writeJson } from "./cli.mjs";

export const HY4_PREDICT = {
  handle: "hy4-predict-app",
  programId: "0xd24f2886dcb29dec16fc53214b7c8e498b2e96ea55d31a1497571e1ae15f5271",
  previousProgramId: "0x2aa206e02547b2c23751e112c0751acb463d80756c34477f12db89fa1fe877e6",
  idl: "integrations/hy4-predict/hy4_predict.idl",
  marketId: 0
};

export function unwrap(value) {
  return value?.result?.ok ?? value?.result?.Ok ?? value?.result?.value ?? value?.result ?? value;
}

export function summarizeHy4Predict({ currentBlock, fastMarket }) {
  const market = fastMarket?.value ?? fastMarket;
  if (!market || typeof market !== "object") {
    return `hy4-predict FastMarket read: current block ${currentBlock}; selected market not available.`;
  }

  const status = typeof market.status === "string"
    ? market.status
    : market.status?.kind ?? Object.keys(market.status ?? {})[0] ?? "Unknown";
  const question = market.question ?? `FastMarket ${HY4_PREDICT.marketId}`;
  const symbol = market.symbol ?? "unknown";
  const openPrice = market.open_price_micro_usd ?? market.openPriceMicroUsd ?? "0";
  const resolveAfter = Number(market.resolve_after_block ?? market.resolveAfterBlock ?? 0);
  const blocksRemaining = Math.max(0, resolveAfter - Number(currentBlock ?? 0));

  return [
    `hy4-predict FastMarket read: ${question}`,
    `symbol ${symbol}`,
    `status ${status}`,
    `open ${openPrice} microUSD`,
    `blocks remaining ${blocksRemaining}`
  ].join("; ");
}

export function runHy4PredictIntegration({ ids, agents, receiptsPath = "artifacts/deploy/hy4-predict-integration-receipts.json" }) {
  const previous = readJson(receiptsPath, []);
  const existingMarket = previous.find((entry) => entry?.receipts?.marketCreated?.messageId);
  const marketCreatedReceipt = existingMarket
    ? { skipped: true, reason: "hy4 prediction market already created", messageId: existingMarket.receipts.marketCreated.messageId }
    : runJson("vara-wallet", varaWalletArgs([
      "call",
      HY4_PREDICT.programId,
      "PredictionMarket/CreateMarket",
      "--args",
      JSON.stringify([
        "Will A2A Radar add another verified external integration before June 2, 2026?",
        "Yes",
        "No"
      ]),
      "--idl",
      HY4_PREDICT.idl
    ]));

  const currentBlockReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    HY4_PREDICT.programId,
    "FastMarket/CurrentBlock",
    "--idl",
    HY4_PREDICT.idl
  ]));
  const currentBlock = unwrap(currentBlockReceipt);

  const fastMarketReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    HY4_PREDICT.programId,
    "FastMarket/FastMarket",
    "--args",
    JSON.stringify([HY4_PREDICT.marketId]),
    "--idl",
    HY4_PREDICT.idl
  ]));
  const fastMarket = unwrap(fastMarketReceipt);
  const summary = summarizeHy4Predict({ currentBlock, fastMarket });

  const coreReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    ids.core,
    "Core/IngestEvent",
    "--args",
    JSON.stringify(["ProviderResponse", HY4_PREDICT.programId, "Prediction", null, 3, summary]),
    "--idl",
    agents.core.idl
  ]));

  const broadcastReceipt = runJson("vara-wallet", varaWalletArgs([
    "call",
    ids.broadcast,
    "Broadcast/AnnounceIntegration",
    "--args",
    JSON.stringify([HY4_PREDICT.programId, summary]),
    "--idl",
    agents.broadcast.idl
  ]));

  const entry = {
    observedAt: new Date().toISOString(),
    partner: HY4_PREDICT,
    summary,
    receipts: {
      marketCreated: marketCreatedReceipt,
      currentBlock: currentBlockReceipt,
      fastMarket: fastMarketReceipt,
      coreIngest: coreReceipt,
      broadcastAnnounce: broadcastReceipt
    }
  };
  writeJson(receiptsPath, [...previous, entry].slice(-50));
  return entry;
}
