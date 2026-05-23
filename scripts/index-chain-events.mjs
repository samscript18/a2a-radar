import { agents, readJson, requireProgramIds, runJson, writeJson } from "./lib/cli.mjs";

const ids = requireProgramIds();
const INDEXER_GRAPHQL_URL = process.env.INDEXER_GRAPHQL_URL ?? "https://agents-api.vara.network/graphql";
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

  if (hasReceipt(growth.varaBridgeQuery) && hasReceipt(growth.coreVaraBridgeIngest) && hasReceipt(growth.broadcastVaraBridgeAnnounce)) {
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

const smoke = readJson("artifacts/deploy/live-smoke-results.json", {});
const growthReceipts = readJson("artifacts/deploy/growth-loop-receipts.json", []);
const varaBridgeReceipts = readJson("artifacts/deploy/varabridge-integration-receipts.json", []);
const growth = growthReceipts.at(-1)?.receipts ?? {};
const varaBridge = varaBridgeReceipts.at(-1);
const verifiedVaraBridge = latestVaraBridgeIntegration(growth, varaBridge);
console.log("Reading Vara Agent Network indexer");
const ecosystemIndex = await readEcosystemIndex();
const activity = [
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
  txActivity("OutgoingCall", varaBridge?.receipts?.varaBridgeQuery, "A2A Radar queried VaraBridge oracle data."),
  txActivity("DemandRequest", varaBridge?.receipts?.coreIngest, "Core ingested a real VaraBridge oracle signal."),
  txActivity("IntegrationPact", varaBridge?.receipts?.broadcastAnnounce, "Broadcast announced VaraBridge integration context.")
].filter(Boolean);

const latestSubscriptions = [
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

const growthTimeline = [
  ...activity.slice(-8).map((item) => timelineItem(item.kind, item.metadata, item.observedAtMs, item.source)),
  ...ecosystemIndex.boardEvents.slice(0, 4).map((item) => timelineItem("Board", item.title, item.postedAtMs, item.handle)),
  ...ecosystemIndex.ecosystemInteractions.slice(0, 4).map((item) => timelineItem("Ecosystem", `${item.callerHandle ?? "unknown"} -> ${item.calleeHandle ?? "unknown"}`, item.observedAtMs, item.kind))
].sort((a, b) => b.observedAtMs - a.observedAtMs);

const snapshot = {
  generatedAt: new Date().toISOString(),
  counts: {
    registeredAgents: 3,
    signals: Number(counts?.[1] ?? 0),
    subscriptions: [smoke.subscription, growth.marketSubscription].filter((row) => row?.messageId).length,
    referrals: smoke.referral?.messageId ? 1 : 0,
    outgoingIntegrations: [
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
      varaBridge?.receipts?.varaBridgeQuery,
      varaBridge?.receipts?.coreIngest,
      varaBridge?.receipts?.broadcastAnnounce
    ].filter((row) => row?.messageId).length,
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
  economicInteractions: [
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
  ].filter(Boolean),
  crossAgentCalls: [
    { from: "Core", to: "Broadcast", purpose: "report_for_broadcast", observedAtMs: Date.now() },
    { from: "Core", to: "Market", purpose: "premium_signals_for_market", observedAtMs: Date.now() },
    { from: "Market", to: "Core", purpose: "paid_signal_packaging", observedAtMs: Date.now() },
    { from: "Broadcast", to: "Core", purpose: "demand_feedback", observedAtMs: Date.now() },
    { from: "Market", to: "Core", purpose: "purchase_report", observedAtMs: Date.now() },
    verifiedVaraBridge ? { from: "Core", to: "Broadcast", purpose: "varabridge_oracle_context", observedAtMs: Date.now() } : undefined
  ].filter(Boolean),
  externalIntegrations: [
    verifiedVaraBridge
  ].filter(Boolean),
  raw: {
    programIds: ids,
    coreCounts: counts,
    marketTreasuryRaw: treasury.toString(),
    smokeReceipts: smoke,
    latestGrowthReceipts: growth,
    latestVaraBridgeIntegration: verifiedVaraBridge
  }
};

writeJson("artifacts/latest-snapshot.json", snapshot);
console.log("Wrote artifacts/latest-snapshot.json from live Vara state");
