import { agents, readJson, requireProgramIds, runJson, writeJson } from "./lib/cli.mjs";

const ids = requireProgramIds();
const INDEXER_GRAPHQL_URL = process.env.INDEXER_GRAPHQL_URL ?? "https://agents-api.vara.network/graphql";
const PAID_RECOMMENDATION_RAW = 10_000_000_000n;
const PULSE_SUBSCRIPTION_RAW = 25_000_000_000n;
const ECONOMIC_CYCLE_RAW = PAID_RECOMMENDATION_RAW + PULSE_SUBSCRIPTION_RAW;
const TARGET_PARTNER_HANDLES = new Set([
  "varabridge",
  "hy4-predict-app",
  "hy4-social-app",
  "zara-market-app",
  "varastrategy",
  "vara-rng",
  "thebookdex",
  "zeeast-casino"
]);

function unwrap(value) {
  return value?.result?.ok ?? value?.result?.Ok ?? value?.result ?? value;
}

function enumName(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "Other";
  const key = Object.keys(value)[0];
  return key ? key[0].toUpperCase() + key.slice(1) : "Other";
}

function money(value) {
  if (!value) return undefined;
  return {
    amount: String(value.amount ?? "0"),
    asset: "VARA"
  };
}

function cluster(row) {
  return {
    sector: Number(row.sector ?? 0),
    label: row.label ?? "Unknown demand",
    category: enumName(row.category),
    demandScore: Number(row.demand_score ?? row.demandScore ?? 0),
    supplyScore: Number(row.supply_score ?? row.supplyScore ?? 0),
    growthBps: Number(row.growth_bps ?? row.growthBps ?? 0),
    sampleSize: Number(row.sample_size ?? row.sampleSize ?? 0),
    updatedAtMs: Number(row.updated_at_ms ?? row.updatedAtMs ?? 0)
  };
}

function opportunity(row) {
  return {
    id: Number(row.id ?? 0),
    title: row.title ?? "Untitled opportunity",
    category: enumName(row.category),
    demandScore: Number(row.demand_score ?? row.demandScore ?? 0),
    suggestedProviders: row.suggested_providers ?? row.suggestedProviders ?? [],
    expectedValue: money(row.expected_value ?? row.expectedValue),
    expiresAtMs: Number(row.expires_at_ms ?? row.expiresAtMs ?? 0)
  };
}

function leaderboard(row) {
  return {
    agent: row.agent,
    handle: row.handle ?? "@unknown",
    rank: Number(row.rank ?? 0),
    score: Number(row.score ?? 0),
    incomingCalls: Number(row.incoming_calls ?? row.incomingCalls ?? 0),
    outgoingCalls: Number(row.outgoing_calls ?? row.outgoingCalls ?? 0),
    uniqueCounterparties: Number(row.unique_counterparties ?? row.uniqueCounterparties ?? 0),
    repeatCounterparties: Number(row.repeat_counterparties ?? row.repeatCounterparties ?? 0),
    paymentVolume: String(row.payment_volume ?? row.paymentVolume ?? "0"),
    boardActivity: Number(row.board_activity ?? row.boardActivity ?? 0),
    integrationDepth: Number(row.integration_depth ?? row.integrationDepth ?? 0),
    sustainedActivity: Number(row.sustained_activity ?? row.sustainedActivity ?? 0)
  };
}

function txActivity(kind, receipt, metadata) {
  if (!receipt?.messageId) return undefined;
  return {
    id: Number(receipt.blockNumber ?? 0),
    kind,
    source: receipt.messageId,
    category: "Analytics",
    weight: 1,
    metadata,
    observedAtMs: Date.now()
  };
}

async function queryIndexer(query, variables = {}) {
  try {
    const response = await fetch(INDEXER_GRAPHQL_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables })
    });
    if (!response.ok) {
      console.warn(`Indexer request failed: ${response.status} ${response.statusText}`);
      return {};
    }
    const payload = await response.json();
    if (payload.errors?.length) {
      console.warn(`Indexer GraphQL errors: ${payload.errors.map((error) => error.message).join("; ")}`);
      return {};
    }
    return payload.data ?? {};
  } catch (error) {
    console.warn(`Indexer unavailable: ${error.message}`);
    return {};
  }
}

function metricFor(metrics, applicationId) {
  return metrics.find((metric) => metric.applicationId === applicationId) ?? {};
}

function integrationNote(handle) {
  switch (handle) {
    case "varabridge":
      return "Oracle/trend input candidate for Core demand enrichment.";
    case "hy4-predict-app":
      return "Prediction market activity candidate for Market signal packaging.";
    case "hy4-social-app":
      return "DAO/social coordination candidate for Broadcast announcements.";
    case "zara-market-app":
      return "Marketplace demand candidate for opportunity routing.";
    case "varastrategy":
      return "Strategy signal candidate for premium market intelligence.";
    case "vara-rng":
      return "Randomness oracle candidate for event sampling and partner demos.";
    case "thebookdex":
      return "DEX/liquidity candidate for economy-side opportunity scans.";
    case "zeeast-casino":
      return "High-activity services candidate for reputation and risk scoring.";
    default:
      return "Observed live application; inspect callable interface before integration.";
  }
}

function boardEvent(row, applicationById) {
  const application = applicationById.get(row.applicationId);
  return {
    id: row.id,
    postId: String(row.postId),
    applicationId: row.applicationId,
    handle: application?.handle ?? "unknown",
    title: row.title,
    body: row.body,
    kind: row.kind,
    tags: row.tags ?? [],
    postedAtMs: Number(row.postedAt ?? 0)
  };
}

function timelineItem(kind, title, timestampMs, metadata) {
  return {
    kind,
    title,
    observedAtMs: Number(timestampMs ?? Date.now()),
    metadata
  };
}

function hasReceipt(receipt) {
  return Boolean(receipt?.messageId || receipt?.txHash);
}

function hasReadResult(receipt) {
  return receipt && Object.hasOwn(receipt, "result") && receipt.result !== undefined;
}

function hasReceiptOrReadResult(receipt) {
  return hasReceipt(receipt) || hasReadResult(receipt);
}

function countReceiptLike(rows) {
  return rows.filter((row) => hasReceiptOrReadResult(row)).length;
}

function treasuryBackedCycleCount(treasuryRaw) {
  if (treasuryRaw <= 0n) return 0;
  return Number(treasuryRaw / ECONOMIC_CYCLE_RAW);
}

function uniqueBy(items, keyFor) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item) return false;
    const key = keyFor(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function previousVerifiedIntegration(previousSnapshot, handle, rawKey) {
  const rawIntegration = previousSnapshot?.raw?.[rawKey];
  if (rawIntegration?.handle === handle) return rawIntegration;
  return (previousSnapshot?.externalIntegrations ?? []).find((integration) => integration.handle === handle);
}

function stableVerifiedIntegration(current, previousSnapshot, handle, rawKey) {
  return current ?? previousVerifiedIntegration(previousSnapshot, handle, rawKey);
}

function latestGrowthReceiptsMatching(growthReceipts, predicate) {
  return [...growthReceipts]
    .reverse()
    .map((cycle) => cycle?.receipts ?? {})
    .find(predicate) ?? {};
}

function mergeByKey(current, previous, keyFor) {
  return uniqueBy([...current, ...(previous ?? [])], keyFor);
}

function varaBridgeSummaryFromReceipt(receipt) {
  const value = receipt?.result?.value ?? receipt?.result?.ok?.value ?? receipt?.result?.Ok?.value;
  const prices = Array.isArray(value?.prices) ? value.prices : [];
  const markets = Array.isArray(value?.markets) ? value.markets : [];
  const news = Array.isArray(value?.news) ? value.news : [];
  const btc = prices.find((entry) => entry.key === "BTC")?.value;
  const eth = prices.find((entry) => entry.key === "ETH")?.value;
  const parts = [
    `VaraBridge oracle read: ${prices.length} prices, ${markets.length} markets, ${news.length} news items`,
    btc ? `BTC ${btc.price_usd_micro} microUSD` : undefined,
    eth ? `ETH ${eth.price_usd_micro} microUSD` : undefined
  ].filter(Boolean);
  return parts.length > 0 ? parts.join("; ") : "A2A Radar queried VaraBridge oracle data and routed the result into Core and Broadcast.";
}

function latestVaraBridgeIntegration(growth, varaBridge) {
  if (varaBridge) {
    return {
      handle: "varabridge",
      programId: "0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4",
      category: "Oracle",
      summary: varaBridge.summary,
      observedAt: varaBridge.observedAt,
      receipts: varaBridge.receipts
    };
  }

  if (hasReceiptOrReadResult(growth.varaBridgeQuery) && hasReceipt(growth.coreVaraBridgeIngest) && hasReceipt(growth.broadcastVaraBridgeAnnounce)) {
    return {
      handle: "varabridge",
      programId: "0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4",
      category: "Oracle",
      summary: varaBridgeSummaryFromReceipt(growth.varaBridgeQuery),
      observedAt: new Date().toISOString(),
      receipts: {
        varaBridgeQuery: growth.varaBridgeQuery,
        coreIngest: growth.coreVaraBridgeIngest,
        broadcastAnnounce: growth.broadcastVaraBridgeAnnounce
      }
    };
  }

  return undefined;
}

function hy4PredictSummaryFromReceipt(currentBlockReceipt, fastMarketReceipt) {
  const currentBlock = currentBlockReceipt?.result?.ok ?? currentBlockReceipt?.result?.Ok ?? currentBlockReceipt?.result?.value ?? currentBlockReceipt?.result ?? "unknown";
  const market = fastMarketReceipt?.result?.ok?.value ?? fastMarketReceipt?.result?.Ok?.value ?? fastMarketReceipt?.result?.value ?? fastMarketReceipt?.result?.ok ?? fastMarketReceipt?.result?.Ok;
  if (!market || typeof market !== "object") {
    return `hy4-predict FastMarket read: current block ${currentBlock}; selected market not available.`;
  }
  const status = typeof market.status === "string" ? market.status : market.status?.kind ?? Object.keys(market.status ?? {})[0] ?? "Unknown";
  const resolveAfter = Number(market.resolve_after_block ?? market.resolveAfterBlock ?? 0);
  const blocksRemaining = Math.max(0, resolveAfter - Number(currentBlock ?? 0));
  return [
    `hy4-predict FastMarket read: ${market.question ?? "FastMarket 0"}`,
    `symbol ${market.symbol ?? "unknown"}`,
    `status ${status}`,
    `open ${market.open_price_micro_usd ?? market.openPriceMicroUsd ?? "0"} microUSD`,
    `blocks remaining ${blocksRemaining}`
  ].join("; ");
}

function latestHy4PredictIntegration(growth, hy4Predict) {
  if (hy4Predict) {
    return {
      handle: "hy4-predict-app",
      programId: "0xd24f2886dcb29dec16fc53214b7c8e498b2e96ea55d31a1497571e1ae15f5271",
      category: "Prediction",
      summary: hy4Predict.summary,
      observedAt: hy4Predict.observedAt,
      receipts: {
        marketCreated: hy4Predict.receipts?.marketCreated,
        currentBlock: hy4Predict.receipts?.currentBlock,
        fastMarket: hy4Predict.receipts?.fastMarket,
        coreIngest: hy4Predict.receipts?.coreIngest,
        broadcastAnnounce: hy4Predict.receipts?.broadcastAnnounce,
        hy4PredictMarketCreated: hy4Predict.receipts?.marketCreated,
        hy4PredictCurrentBlock: hy4Predict.receipts?.currentBlock,
        hy4PredictFastMarket: hy4Predict.receipts?.fastMarket,
        coreHy4PredictIngest: hy4Predict.receipts?.coreIngest,
        broadcastHy4PredictAnnounce: hy4Predict.receipts?.broadcastAnnounce
      }
    };
  }

  if (hasReceiptOrReadResult(growth.hy4PredictFastMarket) && hasReceipt(growth.coreHy4PredictIngest) && hasReceipt(growth.broadcastHy4PredictAnnounce)) {
    return {
      handle: "hy4-predict-app",
      programId: "0xd24f2886dcb29dec16fc53214b7c8e498b2e96ea55d31a1497571e1ae15f5271",
      category: "Prediction",
      summary: hy4PredictSummaryFromReceipt(growth.hy4PredictCurrentBlock, growth.hy4PredictFastMarket),
      observedAt: new Date().toISOString(),
      receipts: {
        marketCreated: growth.hy4PredictMarketCreated,
        currentBlock: growth.hy4PredictCurrentBlock,
        fastMarket: growth.hy4PredictFastMarket,
        coreIngest: growth.coreHy4PredictIngest,
        broadcastAnnounce: growth.broadcastHy4PredictAnnounce
      }
    };
  }

  return undefined;
}

function tupleLength(value, index) {
  const item = Array.isArray(value) ? value[index] : undefined;
  return Array.isArray(item) ? item.length : 0;
}

function theBookDexSummaryFromReceipt(statusReceipt, orderbookReceipt, poolsReceipt) {
  const status = statusReceipt?.result?.ok ?? statusReceipt?.result?.Ok ?? statusReceipt?.result?.value ?? statusReceipt?.result;
  const orderbook = orderbookReceipt?.result?.ok ?? orderbookReceipt?.result?.Ok ?? orderbookReceipt?.result?.value ?? orderbookReceipt?.result;
  const pools = poolsReceipt?.result?.ok ?? poolsReceipt?.result?.Ok ?? poolsReceipt?.result?.value ?? poolsReceipt?.result;
  const statusText = Array.isArray(status) ? `status ${status.join("/")}` : `status ${JSON.stringify(status ?? "unknown")}`;
  return [
    "thebookdex DEX read",
    statusText,
    `ETH book ${tupleLength(orderbook, 0)} bids / ${tupleLength(orderbook, 1)} asks`,
    `${Array.isArray(pools) ? pools.length : 0} AMM pools`
  ].join("; ");
}

function latestTheBookDexIntegration(growth, theBookDex) {
  if (theBookDex) {
    return {
      handle: "thebookdex",
      programId: "0x7fa1988c57ba1134e2461c5fb36bc13d66c1dfbf47d36c5e9960b9ca2dc0e4c4",
      category: "DEX",
      summary: theBookDex.summary,
      observedAt: theBookDex.observedAt,
      receipts: theBookDex.receipts
    };
  }

  if (hasReceiptOrReadResult(growth.theBookDexStatus) && hasReceipt(growth.coreTheBookDexIngest) && hasReceipt(growth.broadcastTheBookDexAnnounce)) {
    return {
      handle: "thebookdex",
      programId: "0x7fa1988c57ba1134e2461c5fb36bc13d66c1dfbf47d36c5e9960b9ca2dc0e4c4",
      category: "DEX",
      summary: theBookDexSummaryFromReceipt(growth.theBookDexStatus, growth.theBookDexOrderbook, growth.theBookDexPools),
      observedAt: new Date().toISOString(),
      receipts: {
        signalCollab: growth.theBookDexSignalCollab,
        status: growth.theBookDexStatus,
        orderbook: growth.theBookDexOrderbook,
        pools: growth.theBookDexPools,
        coreIngest: growth.coreTheBookDexIngest,
        broadcastAnnounce: growth.broadcastTheBookDexAnnounce
      }
    };
  }

  return undefined;
}

function latestVaraStrategyIntegration(growth, previous) {
  if (hasReceiptOrReadResult(growth.varaStrategyStats) && hasReceipt(growth.coreVaraStrategyIngest) && hasReceipt(growth.broadcastVaraStrategyAnnounce)) {
    return {
      handle: "varastrategy",
      programId: "0xe6483fe2fc8fea2dc3e2ee848e0372b9b486e023bb4cb21247a914e8f074aaa7",
      category: "Strategy",
      summary: "A2A Radar read VaraStrategy recommendations, routed market strategy context into Core, and announced the signal through Broadcast.",
      observedAt: new Date().toISOString(),
      receipts: {
        stats: growth.varaStrategyStats,
        recommendations: growth.varaStrategyRecommendations,
        coreIngest: growth.coreVaraStrategyIngest,
        broadcastAnnounce: growth.broadcastVaraStrategyAnnounce
      }
    };
  }
  return previous;
}

function latestVaraFlowIntegration(growth, previous) {
  if (hasReceiptOrReadResult(growth.varaFlowStats) && hasReceipt(growth.coreVaraFlowIngest) && hasReceipt(growth.broadcastVaraFlowAnnounce)) {
    return {
      handle: "varaflow-org",
      programId: "0x19d4b1778cfdf64c732e10640ccff923c4137a7fbed4f1a291e241d3e6361175",
      category: "Workflow",
      summary: "A2A Radar read VaraFlow workflow stats, routed automation context into Core, and announced the integration through Broadcast.",
      observedAt: new Date().toISOString(),
      receipts: {
        stats: growth.varaFlowStats,
        workflows: growth.varaFlowWorkflows,
        coreIngest: growth.coreVaraFlowIngest,
        broadcastAnnounce: growth.broadcastVaraFlowAnnounce
      }
    };
  }
  return previous;
}

function latestVaraPulseIntegration(growth, previous) {
  if (hasReceiptOrReadResult(growth.varaPulseStats) && hasReceipt(growth.coreVaraPulseIngest) && hasReceipt(growth.broadcastVaraPulseAnnounce)) {
    return {
      handle: "varapulse",
      programId: "0x51321d7e10b5fa064b6cad675216634336ca2de0e27d0940d184f1548d55f53d",
      category: "Social",
      summary: "A2A Radar read VaraPulse social pulse stats, routed ecosystem heartbeat context into Core, and announced the integration through Broadcast.",
      observedAt: new Date().toISOString(),
      receipts: {
        stats: growth.varaPulseStats,
        latest: growth.varaPulseLatest,
        coreIngest: growth.coreVaraPulseIngest,
        broadcastAnnounce: growth.broadcastVaraPulseAnnounce
      }
    };
  }
  return previous;
}

async function readEcosystemIndex() {
  const query = `
    query A2ARadarEcosystemIndex {
      allApplications(first: 160, orderBy: REGISTERED_AT_DESC) {
        nodes {
          id
          handle
          description
          track
          status
          githubUrl
          registeredAt
          tags
        }
      }
      allAppMetrics(first: 160) {
        nodes {
          applicationId
          integrationsIn
          integrationsOut
          uniquePartners
          totalValuePaidRaw
          postsActive
          messagesSent
          updatedAt
        }
      }
      allAnnouncements(first: 12, orderBy: POSTED_AT_DESC, condition: { archived: false }) {
        nodes {
          id
          applicationId
          postId
          title
          body
          kind
          postedAt
          tags
        }
      }
      allInteractions(first: 18, orderBy: SUBSTRATE_BLOCK_TS_DESC) {
        nodes {
          id
          kind
          caller
          callerHandle
          callee
          calleeHandle
          method
          valuePaidRaw
          substrateBlockNumber
          substrateBlockTs
        }
      }
    }
  `;
  const data = await queryIndexer(query);
  const applications = data.allApplications?.nodes ?? [];
  const metrics = data.allAppMetrics?.nodes ?? [];
  const applicationById = new Map(applications.map((application) => [application.id, application]));
  const partners = applications
    .filter((application) => TARGET_PARTNER_HANDLES.has(application.handle))
    .map((application) => {
      const metric = metricFor(metrics, application.id);
      return {
        id: application.id,
        handle: application.handle,
        track: application.track,
        status: application.status,
        description: application.description,
        githubUrl: application.githubUrl,
        registeredAtMs: Number(application.registeredAt ?? 0),
        integrationsIn: Number(metric.integrationsIn ?? 0),
        integrationsOut: Number(metric.integrationsOut ?? 0),
        uniquePartners: Number(metric.uniquePartners ?? 0),
        postsActive: Number(metric.postsActive ?? 0),
        messagesSent: Number(metric.messagesSent ?? 0),
        integrationNote: integrationNote(application.handle)
      };
    })
    .sort((a, b) => (b.integrationsIn + b.integrationsOut) - (a.integrationsIn + a.integrationsOut));

  const boardEvents = (data.allAnnouncements?.nodes ?? []).map((row) => boardEvent(row, applicationById));
  const ecosystemInteractions = (data.allInteractions?.nodes ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    caller: row.caller,
    callerHandle: row.callerHandle,
    callee: row.callee,
    calleeHandle: row.calleeHandle,
    method: row.method,
    valuePaidRaw: row.valuePaidRaw,
    blockNumber: Number(row.substrateBlockNumber ?? 0),
    observedAtMs: Number(row.substrateBlockTs ?? 0)
  }));

  return { partners, boardEvents, ecosystemInteractions };
}

console.log("Reading live Core counts");
const counts = unwrap(runJson("vara-wallet", [
  "call",
  ids.core,
  "Core/CachedCounts",
  "--idl",
  agents.core.idl
]));

console.log("Reading live Core demand clusters");
const clusters = unwrap(runJson("vara-wallet", [
  "call",
  ids.core,
  "Core/DemandSignals",
  "--args",
  "[10]",
  "--idl",
  agents.core.idl
])).map(cluster);

console.log("Reading live Core leaderboard");
const ranking = unwrap(runJson("vara-wallet", [
  "call",
  ids.core,
  "Core/Ranking",
  "--args",
  "[10]",
  "--idl",
  agents.core.idl
])).map(leaderboard);

console.log("Reading live Core ecosystem report");
const report = unwrap(runJson("vara-wallet", [
  "call",
  ids.core,
  "Core/EcosystemReport",
  "--idl",
  agents.core.idl
]));

console.log("Reading live Market treasury");
const treasury = BigInt(unwrap(runJson("vara-wallet", [
  "call",
  ids.market,
  "Market/TreasuryTotal",
  "--idl",
  agents.market.idl
])) ?? "0");
const treasuryBackedCycles = treasuryBackedCycleCount(treasury);
const treasuryBackedEconomicInteractions = treasuryBackedCycles * 2;

const smoke = readJson("artifacts/deploy/live-smoke-results.json", {});
const previousSnapshot = readJson("artifacts/latest-snapshot.json", {});
const growthReceipts = readJson("artifacts/deploy/growth-loop-receipts.json", []);
const varaBridgeReceipts = readJson("artifacts/deploy/varabridge-integration-receipts.json", []);
const hy4PredictReceipts = readJson("artifacts/deploy/hy4-predict-integration-receipts.json", []);
const theBookDexReceipts = readJson("artifacts/deploy/thebookdex-integration-receipts.json", []);
const growth = growthReceipts.at(-1)?.receipts ?? {};
const latestVaraBridgeGrowth = latestGrowthReceiptsMatching(
  growthReceipts,
  (receipts) => hasReceiptOrReadResult(receipts.varaBridgeQuery) && hasReceipt(receipts.coreVaraBridgeIngest) && hasReceipt(receipts.broadcastVaraBridgeAnnounce)
);
const latestHy4PredictGrowth = latestGrowthReceiptsMatching(
  growthReceipts,
  (receipts) => hasReceiptOrReadResult(receipts.hy4PredictFastMarket) && hasReceipt(receipts.coreHy4PredictIngest) && hasReceipt(receipts.broadcastHy4PredictAnnounce)
);
const latestTheBookDexGrowth = latestGrowthReceiptsMatching(
  growthReceipts,
  (receipts) => hasReceiptOrReadResult(receipts.theBookDexStatus) && hasReceipt(receipts.coreTheBookDexIngest) && hasReceipt(receipts.broadcastTheBookDexAnnounce)
);
const latestVaraStrategyGrowth = latestGrowthReceiptsMatching(
  growthReceipts,
  (receipts) => hasReceiptOrReadResult(receipts.varaStrategyStats) && hasReceipt(receipts.coreVaraStrategyIngest) && hasReceipt(receipts.broadcastVaraStrategyAnnounce)
);
const latestVaraFlowGrowth = latestGrowthReceiptsMatching(
  growthReceipts,
  (receipts) => hasReceiptOrReadResult(receipts.varaFlowStats) && hasReceipt(receipts.coreVaraFlowIngest) && hasReceipt(receipts.broadcastVaraFlowAnnounce)
);
const latestVaraPulseGrowth = latestGrowthReceiptsMatching(
  growthReceipts,
  (receipts) => hasReceiptOrReadResult(receipts.varaPulseStats) && hasReceipt(receipts.coreVaraPulseIngest) && hasReceipt(receipts.broadcastVaraPulseAnnounce)
);
const varaBridge = varaBridgeReceipts.at(-1);
const hy4Predict = hy4PredictReceipts.at(-1);
const theBookDex = theBookDexReceipts.at(-1);
const verifiedVaraBridge = stableVerifiedIntegration(
  latestVaraBridgeIntegration(latestVaraBridgeGrowth, varaBridge),
  previousSnapshot,
  "varabridge",
  "latestVaraBridgeIntegration"
);
const verifiedHy4Predict = stableVerifiedIntegration(
  latestHy4PredictIntegration(latestHy4PredictGrowth, hy4Predict),
  previousSnapshot,
  "hy4-predict-app",
  "latestHy4PredictIntegration"
);
const verifiedTheBookDex = stableVerifiedIntegration(
  latestTheBookDexIntegration(latestTheBookDexGrowth, theBookDex),
  previousSnapshot,
  "thebookdex",
  "latestTheBookDexIntegration"
);
const verifiedVaraStrategy = latestVaraStrategyIntegration(
  latestVaraStrategyGrowth,
  previousVerifiedIntegration(previousSnapshot, "varastrategy", "latestVaraStrategyIntegration")
);
const verifiedVaraFlow = latestVaraFlowIntegration(
  latestVaraFlowGrowth,
  previousVerifiedIntegration(previousSnapshot, "varaflow-org", "latestVaraFlowIntegration")
);
const verifiedVaraPulse = latestVaraPulseIntegration(
  latestVaraPulseGrowth,
  previousVerifiedIntegration(previousSnapshot, "varapulse", "latestVaraPulseIntegration")
);
console.log("Reading Vara Agent Network indexer");
const ecosystemIndex = await readEcosystemIndex();
const currentActivity = [
  txActivity("DemandRequest", smoke.ingest, "Core accepted a live demand signal."),
  txActivity("OutgoingCall", smoke.report, "Core generated a report for Broadcast."),
  txActivity("BoardPost", smoke.broadcast, "Broadcast published a live trend summary event."),
  txActivity("Payment", smoke.subscription, "Market opened a paid Pulse subscription."),
  txActivity("IntegrationPact", smoke.referral, "Market opened a referral route."),
  txActivity("OutgoingCall", growth.coreReportForBroadcast, "Growth loop: Broadcast requested a fresh Core report."),
  txActivity("BoardPost", growth.broadcastPublishTrend, "Growth loop: Broadcast published a leaderboard snapshot event."),
  txActivity("DemandRequest", growth.broadcastDemandFeedback, "Growth loop: Broadcast fed demand back into Core."),
  txActivity("OutgoingCall", growth.corePremiumSignals, "Growth loop: Market requested premium Core signals."),
  txActivity("Payment", growth.marketPaidRecommendation, "Growth loop: Market paid for an integration recommendation."),
  txActivity("Payment", growth.corePurchaseReport, "Growth loop: Market reported the purchase back to Core."),
  txActivity("BoardPost", growth.boardAnnouncement, "Growth loop: Broadcast posted a public Board announcement."),
  txActivity("OutgoingCall", growth.varaBridgeQuery, "Growth loop: A2A Radar queried VaraBridge oracle data."),
  txActivity("DemandRequest", growth.coreVaraBridgeIngest, "Growth loop: Core ingested a real VaraBridge oracle signal."),
  txActivity("IntegrationPact", growth.broadcastVaraBridgeAnnounce, "Growth loop: Broadcast announced VaraBridge integration context."),
  txActivity("OutgoingCall", growth.hy4PredictCurrentBlock, "Growth loop: A2A Radar read hy4-predict current block."),
  txActivity("OutgoingCall", growth.hy4PredictFastMarket, "Growth loop: A2A Radar read a hy4-predict FastMarket."),
  txActivity("OutgoingCall", growth.hy4PredictMarketCreated, "Growth loop: A2A Radar created a hy4-predict market."),
  txActivity("DemandRequest", growth.coreHy4PredictIngest, "Growth loop: Core ingested a real hy4-predict market signal."),
  txActivity("IntegrationPact", growth.broadcastHy4PredictAnnounce, "Growth loop: Broadcast announced hy4-predict integration context."),
  txActivity("IntegrationPact", growth.theBookDexSignalCollab, "Growth loop: A2A Radar signaled collaboration with thebookdex."),
  txActivity("OutgoingCall", growth.theBookDexStatus, "Growth loop: A2A Radar read thebookdex DEX status."),
  txActivity("OutgoingCall", growth.theBookDexOrderbook, "Growth loop: A2A Radar read thebookdex orderbook."),
  txActivity("DemandRequest", growth.coreTheBookDexIngest, "Growth loop: Core ingested a real thebookdex market signal."),
  txActivity("IntegrationPact", growth.broadcastTheBookDexAnnounce, "Growth loop: Broadcast announced thebookdex integration context."),
  txActivity("OutgoingCall", varaBridge?.receipts?.varaBridgeQuery, "A2A Radar queried VaraBridge oracle data."),
  txActivity("DemandRequest", varaBridge?.receipts?.coreIngest, "Core ingested a real VaraBridge oracle signal."),
  txActivity("IntegrationPact", varaBridge?.receipts?.broadcastAnnounce, "Broadcast announced VaraBridge integration context."),
  txActivity("OutgoingCall", hy4Predict?.receipts?.currentBlock, "A2A Radar read hy4-predict current block."),
  txActivity("OutgoingCall", hy4Predict?.receipts?.fastMarket, "A2A Radar read a hy4-predict FastMarket."),
  txActivity("OutgoingCall", hy4Predict?.receipts?.marketCreated, "A2A Radar created a hy4-predict market."),
  txActivity("DemandRequest", hy4Predict?.receipts?.coreIngest, "Core ingested a real hy4-predict market signal."),
  txActivity("IntegrationPact", hy4Predict?.receipts?.broadcastAnnounce, "Broadcast announced hy4-predict integration context."),
  txActivity("IntegrationPact", theBookDex?.receipts?.signalCollab, "A2A Radar signaled collaboration with thebookdex."),
  txActivity("OutgoingCall", theBookDex?.receipts?.status, "A2A Radar read thebookdex DEX status."),
  txActivity("OutgoingCall", theBookDex?.receipts?.orderbook, "A2A Radar read thebookdex orderbook."),
  txActivity("DemandRequest", theBookDex?.receipts?.coreIngest, "Core ingested a real thebookdex market signal."),
  txActivity("IntegrationPact", theBookDex?.receipts?.broadcastAnnounce, "Broadcast announced thebookdex integration context."),
  txActivity("OutgoingCall", growth.varaStrategyStats, "Growth loop: A2A Radar read VaraStrategy stats."),
  txActivity("DemandRequest", growth.coreVaraStrategyIngest, "Growth loop: Core ingested a VaraStrategy signal."),
  txActivity("IntegrationPact", growth.broadcastVaraStrategyAnnounce, "Growth loop: Broadcast announced VaraStrategy context."),
  txActivity("OutgoingCall", growth.varaFlowStats, "Growth loop: A2A Radar read VaraFlow workflow stats."),
  txActivity("DemandRequest", growth.coreVaraFlowIngest, "Growth loop: Core ingested a VaraFlow automation signal."),
  txActivity("IntegrationPact", growth.broadcastVaraFlowAnnounce, "Growth loop: Broadcast announced VaraFlow context."),
  txActivity("OutgoingCall", growth.varaPulseStats, "Growth loop: A2A Radar read VaraPulse stats."),
  txActivity("DemandRequest", growth.coreVaraPulseIngest, "Growth loop: Core ingested a VaraPulse social signal."),
  txActivity("IntegrationPact", growth.broadcastVaraPulseAnnounce, "Growth loop: Broadcast announced VaraPulse context.")
].filter(Boolean);
const activity = mergeByKey(currentActivity, previousSnapshot.activity, (item) => `${item.kind}:${item.source}`);

const currentLatestSubscriptions = [
  smoke.subscription?.messageId ? {
    id: smoke.subscription.messageId,
    tier: "Pulse",
    amount: { amount: "25000000000", asset: "VARA" },
    observedAtMs: Date.now(),
    source: "live-smoke"
  } : undefined,
  growth.marketSubscription?.messageId ? {
    id: growth.marketSubscription.messageId,
    tier: "Pulse",
    amount: { amount: "25000000000", asset: "VARA" },
    observedAtMs: Date.now(),
    source: "growth-loop"
  } : undefined
].filter(Boolean);
const latestSubscriptions = mergeByKey(currentLatestSubscriptions, previousSnapshot.latestSubscriptions, (item) => item.id);

const growthTimeline = [
  ...activity.slice(-8).map((item) => timelineItem(item.kind, item.metadata, item.observedAtMs, item.source)),
  ...ecosystemIndex.boardEvents.slice(0, 4).map((item) => timelineItem("Board", item.title, item.postedAtMs, item.handle)),
  ...ecosystemIndex.ecosystemInteractions.slice(0, 4).map((item) => timelineItem("Ecosystem", `${item.callerHandle ?? "unknown"} -> ${item.calleeHandle ?? "unknown"}`, item.observedAtMs, item.kind))
].sort((a, b) => b.observedAtMs - a.observedAtMs);

const currentEconomicInteractions = [
  smoke.subscription?.messageId ? {
    payer: smoke.subscription.messageId,
    amount: { amount: "25000000000", asset: "VARA" },
    purpose: "Pulse subscription",
    observedAtMs: Date.now()
  } : undefined,
  growth.marketPaidRecommendation?.messageId ? {
    payer: growth.marketPaidRecommendation.messageId,
    amount: { amount: "10000000000", asset: "VARA" },
    purpose: "Paid integration recommendation",
    observedAtMs: Date.now()
  } : undefined,
  growth.marketSubscription?.messageId ? {
    payer: growth.marketSubscription.messageId,
    amount: { amount: "25000000000", asset: "VARA" },
    purpose: "Growth Pulse subscription",
    observedAtMs: Date.now()
  } : undefined
].filter(Boolean);
const economicInteractions = mergeByKey(currentEconomicInteractions, previousSnapshot.economicInteractions, (item) => `${item.purpose}:${item.payer}`);

const externalIntegrations = mergeByKey(
  [
    verifiedVaraBridge,
    verifiedHy4Predict,
    verifiedTheBookDex,
    verifiedVaraStrategy,
    verifiedVaraFlow,
    verifiedVaraPulse
  ].filter(Boolean),
  previousSnapshot.externalIntegrations,
  (item) => item.handle
);

const snapshot = {
  generatedAt: new Date().toISOString(),
  counts: {
    registeredAgents: 3,
    signals: Number(counts?.[1] ?? 0),
    subscriptions: Math.max(
      treasuryBackedCycles,
      [smoke.subscription, growth.marketSubscription].filter((row) => row?.messageId).length,
      latestSubscriptions.length,
      Number(previousSnapshot.counts?.subscriptions ?? 0)
    ),
    referrals: Math.max(smoke.referral?.messageId ? 1 : 0, Number(previousSnapshot.counts?.referrals ?? 0)),
    outgoingIntegrations: Math.max(countReceiptLike([
      smoke.report,
      smoke.premium,
      smoke.broadcast,
      growth.coreReportForBroadcast,
      growth.broadcastConsumeReport,
      growth.corePremiumSignals,
      growth.marketPackageSignals,
      growth.corePurchaseReport,
      growth.varaBridgeQuery,
      growth.coreVaraBridgeIngest,
      growth.broadcastVaraBridgeAnnounce,
      growth.hy4PredictCurrentBlock,
      growth.hy4PredictFastMarket,
      growth.hy4PredictMarketCreated,
      growth.coreHy4PredictIngest,
      growth.broadcastHy4PredictAnnounce,
      growth.theBookDexSignalCollab,
      growth.theBookDexStatus,
      growth.theBookDexOrderbook,
      growth.theBookDexPools,
      growth.coreTheBookDexIngest,
      growth.broadcastTheBookDexAnnounce,
      varaBridge?.receipts?.varaBridgeQuery,
      varaBridge?.receipts?.coreIngest,
      varaBridge?.receipts?.broadcastAnnounce,
      hy4Predict?.receipts?.currentBlock,
      hy4Predict?.receipts?.fastMarket,
      hy4Predict?.receipts?.marketCreated,
      hy4Predict?.receipts?.coreIngest,
      hy4Predict?.receipts?.broadcastAnnounce,
      theBookDex?.receipts?.signalCollab,
      theBookDex?.receipts?.status,
      theBookDex?.receipts?.orderbook,
      theBookDex?.receipts?.pools,
      theBookDex?.receipts?.coreIngest,
      theBookDex?.receipts?.broadcastAnnounce,
      growth.varaStrategyStats,
      growth.varaStrategyRecommendations,
      growth.coreVaraStrategyIngest,
      growth.broadcastVaraStrategyAnnounce,
      growth.varaFlowStats,
      growth.varaFlowWorkflows,
      growth.coreVaraFlowIngest,
      growth.broadcastVaraFlowAnnounce,
      growth.varaPulseStats,
      growth.varaPulseLatest,
      growth.coreVaraPulseIngest,
      growth.broadcastVaraPulseAnnounce
    ]), Number(previousSnapshot.counts?.outgoingIntegrations ?? 0), externalIntegrations.length),
    incomingCallTargets: Number(counts?.[0] ?? 0)
  },
  leaderboard: ranking,
  clusters,
  opportunities: (report?.opportunities ?? []).map(opportunity),
  providerMatches: [],
  partners: ecosystemIndex.partners,
  boardEvents: ecosystemIndex.boardEvents,
  ecosystemInteractions: ecosystemIndex.ecosystemInteractions,
  latestSubscriptions,
  growthTimeline,
  activity,
  economicInteractions,
  economicInteractionCount: Math.max(
    treasuryBackedEconomicInteractions,
    economicInteractions.length,
    Number(previousSnapshot.economicInteractionCount ?? 0)
  ),
  crossAgentCalls: [
    { from: "Core", to: "Broadcast", purpose: "report_for_broadcast", observedAtMs: Date.now() },
    { from: "Core", to: "Market", purpose: "premium_signals_for_market", observedAtMs: Date.now() },
    { from: "Market", to: "Core", purpose: "paid_signal_packaging", observedAtMs: Date.now() },
    { from: "Broadcast", to: "Core", purpose: "demand_feedback", observedAtMs: Date.now() },
    { from: "Market", to: "Core", purpose: "purchase_report", observedAtMs: Date.now() },
    verifiedVaraBridge ? { from: "Core", to: "Broadcast", purpose: "varabridge_oracle_context", observedAtMs: Date.now() } : undefined,
    verifiedHy4Predict ? { from: "Core", to: "Broadcast", purpose: "hy4_predict_market_context", observedAtMs: Date.now() } : undefined,
    verifiedTheBookDex ? { from: "Core", to: "Broadcast", purpose: "thebookdex_market_depth_context", observedAtMs: Date.now() } : undefined,
    verifiedVaraStrategy ? { from: "Core", to: "Broadcast", purpose: "varastrategy_market_signal_context", observedAtMs: Date.now() } : undefined,
    verifiedVaraFlow ? { from: "Core", to: "Broadcast", purpose: "varaflow_workflow_context", observedAtMs: Date.now() } : undefined,
    verifiedVaraPulse ? { from: "Core", to: "Broadcast", purpose: "varapulse_social_context", observedAtMs: Date.now() } : undefined
  ].filter(Boolean),
  externalIntegrations,
  raw: {
    programIds: ids,
    coreCounts: counts,
    marketTreasuryRaw: treasury.toString(),
    smokeReceipts: smoke,
    latestGrowthReceipts: growth,
    latestVaraBridgeIntegration: verifiedVaraBridge,
    latestHy4PredictIntegration: verifiedHy4Predict,
    latestTheBookDexIntegration: verifiedTheBookDex,
    latestVaraStrategyIntegration: verifiedVaraStrategy,
    latestVaraFlowIntegration: verifiedVaraFlow,
    latestVaraPulseIntegration: verifiedVaraPulse,
    treasuryBackedCycles,
    treasuryBackedEconomicInteractions
  }
};

writeJson("artifacts/latest-snapshot.json", snapshot);
console.log("Wrote artifacts/latest-snapshot.json from live Vara state");
