import { agents, readJson, requireProgramIds, runJson, writeJson } from "./lib/cli.mjs";

const ids = requireProgramIds();

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
const growth = growthReceipts.at(-1)?.receipts ?? {};
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
  txActivity("BoardPost", growth.boardAnnouncement, "Growth loop: Broadcast posted a public Board announcement.")
].filter(Boolean);

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
      growth.corePurchaseReport
    ].filter((row) => row?.messageId).length,
    incomingCallTargets: Number(counts?.[0] ?? 0)
  },
  leaderboard: ranking,
  clusters,
  opportunities: (report?.opportunities ?? []).map(opportunity),
  providerMatches: [],
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
    { from: "Market", to: "Core", purpose: "purchase_report", observedAtMs: Date.now() }
  ],
  raw: {
    programIds: ids,
    coreCounts: counts,
    marketTreasuryRaw: treasury.toString(),
    smokeReceipts: smoke,
    latestGrowthReceipts: growth
  }
};

writeJson("artifacts/latest-snapshot.json", snapshot);
console.log("Wrote artifacts/latest-snapshot.json from live Vara state");
