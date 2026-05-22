import { spawnSync } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const LIVE_V2_PROGRAM_IDS = {
  core: "0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503",
  broadcast: "0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a",
  market: "0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176"
} as const;

type ProgramKey = keyof typeof LIVE_V2_PROGRAM_IDS;
type JsonObject = Record<string, unknown>;

export interface GrowthCycleOptions {
  repoRoot?: string;
  force?: boolean;
  nowMs?: number;
}

export type GrowthCycleResult =
  | {
      ok: true;
      skipped: true;
      nextCycleDueInSeconds: number;
    }
  | {
      ok: true;
      skipped: false;
      callsExecuted: number;
      treasuryDelta: string;
      subscriptions: number;
      boardAnnouncementId: string | null;
      receiptsPath: string;
    };

const RELATIVE_STATE_PATH = "artifacts/deploy/growth-loop-state.json";
const RELATIVE_RECEIPTS_PATH = "artifacts/deploy/growth-loop-receipts.json";

const agents = {
  core: { idl: "artifacts/idl/a2a_radar_core_program.idl" },
  broadcast: { idl: "artifacts/idl/a2a_radar_broadcast_program.idl" },
  market: { idl: "artifacts/idl/a2a_radar_market_program.idl" }
} as const;

const VARABRIDGE = {
  programId: "0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4",
  idl: "integrations/vara-trinity/vara_bridge.idl",
  query: { query_type: "all", symbol: null, keys: null }
} as const;

function repoRoot(options: GrowthCycleOptions = {}) {
  return resolve(options.repoRoot ?? process.cwd());
}

function absolute(root: string, path: string) {
  return resolve(root, path);
}

function readJson<T>(root: string, path: string, fallback: T): T {
  const fullPath = absolute(root, path);
  if (!existsSync(fullPath)) return fallback;
  return JSON.parse(readFileSync(fullPath, "utf8")) as T;
}

function writeJson(root: string, path: string, value: unknown) {
  const fullPath = absolute(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function appendReceipt(root: string, cycle: JsonObject) {
  const previous = readJson<JsonObject[]>(root, RELATIVE_RECEIPTS_PATH, []);
  previous.push(cycle);
  writeJson(root, RELATIVE_RECEIPTS_PATH, previous.slice(-100));
}

function now(options: GrowthCycleOptions) {
  return options.nowMs ?? Date.now();
}

function intervalMs(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function due(state: JsonObject, key: string, ms: number, options: GrowthCycleOptions) {
  const last = Number(state[key] ?? 0);
  return options.force === true || process.env.FORCE_GROWTH_LOOP === "1" || !last || now(options) - last >= ms;
}

function nextDueSeconds(state: JsonObject, ms: number, options: GrowthCycleOptions) {
  const last = Number(state.lastCycleAt ?? 0);
  if (!last) return 0;
  return Math.max(0, Math.ceil((ms - (now(options) - last)) / 1000));
}

function resolveProgramIds(root: string) {
  const fromFile = readJson<Partial<Record<ProgramKey, string>>>(root, "artifacts/deploy/program-ids.json", {});
  return {
    core: fromFile.core ?? LIVE_V2_PROGRAM_IDS.core,
    broadcast: fromFile.broadcast ?? LIVE_V2_PROGRAM_IDS.broadcast,
    market: fromFile.market ?? LIVE_V2_PROGRAM_IDS.market
  };
}

function assertLiveV2Ids(ids: Record<ProgramKey, string>) {
  for (const key of Object.keys(LIVE_V2_PROGRAM_IDS) as ProgramKey[]) {
    if (ids[key] !== LIVE_V2_PROGRAM_IDS[key]) {
      throw new Error(`Refusing to run growth loop against non-v2 ${key} id. Expected ${LIVE_V2_PROGRAM_IDS[key]}, found ${ids[key]}.`);
    }
  }
}

function varaWalletArgs(args: string[]) {
  const prefix: string[] = [];
  if (process.env.ACCT) prefix.push("--account", process.env.ACCT);
  if (process.env.VARA_NETWORK) prefix.push("--network", process.env.VARA_NETWORK);
  return [...prefix, ...args];
}

function readVoucher(root: string) {
  return process.env.VOUCHER_ID ?? readJson<{ voucherId?: string }>(root, "artifacts/deploy/voucher.json", {}).voucherId;
}

function withVoucher(root: string, args: string[]) {
  const voucher = readVoucher(root);
  return voucher ? [...args, "--voucher", voucher] : args;
}

function parseJsonOutput(output: string) {
  try {
    return JSON.parse(output) as JsonObject;
  } catch {
    const last = output.trim().split("\n").filter(Boolean).at(-1);
    return JSON.parse(last ?? "{}") as JsonObject;
  }
}

function runJson(root: string, args: string[]) {
  const result = spawnSync("vara-wallet", ["--json", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env
  });
  if (result.status !== 0) {
    const details = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    throw new Error(`vara-wallet ${args.join(" ")} failed${details ? `: ${details}` : ""}`);
  }
  return parseJsonOutput(result.stdout ?? "");
}

function call(root: string, programId: string, method: string, args: unknown[], idl: string, extra: string[] = []) {
  return runJson(root, varaWalletArgs([
    "call",
    programId,
    method,
    "--args",
    JSON.stringify(args),
    "--idl",
    idl,
    ...extra
  ]));
}

function callNoArgs(root: string, programId: string, method: string, idl: string, extra: string[] = []) {
  return runJson(root, varaWalletArgs([
    "call",
    programId,
    method,
    "--idl",
    idl,
    ...extra
  ]));
}

function unwrap(value: JsonObject) {
  const result = value.result as JsonObject | undefined;
  return result?.ok ?? result?.Ok ?? result ?? value;
}

function boardPost(root: string, app: string, title: string, body: string, tags: string[]) {
  const boardPid = process.env.BOARD_PID ?? process.env.REGISTRY_PID;
  const boardIdl = process.env.BOARD_IDL ?? process.env.REGISTRY_IDL ?? process.env.IDL;
  if (!boardPid || !boardIdl) {
    return { skipped: true, reason: "BOARD_PID and BOARD_IDL/IDL not set" };
  }
  return runJson(root, varaWalletArgs(withVoucher(root, [
    "call",
    boardPid,
    "Board/PostAnnouncement",
    "--args",
    JSON.stringify([app, { title, body, tags }]),
    "--idl",
    boardIdl
  ])));
}

function countExecuted(receipts: JsonObject) {
  return Object.values(receipts).filter((receipt) => {
    if (!receipt || typeof receipt !== "object") return false;
    return "messageId" in receipt || "txHash" in receipt;
  }).length;
}

function boardAnnouncementId(receipts: JsonObject) {
  const board = receipts.boardAnnouncement as JsonObject | undefined;
  const result = board?.result;
  return typeof result === "string" ? result : null;
}

function treasuryDelta(receipts: JsonObject) {
  let total = 0n;
  if ((receipts.marketPaidRecommendation as JsonObject | undefined)?.messageId) {
    total += BigInt(process.env.GROWTH_PAYMENT_RAW ?? "10000000000");
  }
  if ((receipts.marketSubscription as JsonObject | undefined)?.messageId) {
    total += 25_000_000_000n;
  }
  return total.toString();
}

function summarizeBridgeReply(reply: JsonObject) {
  const container = (reply.value as JsonObject | undefined) ?? reply;
  const prices = Array.isArray(container.prices) ? container.prices as JsonObject[] : [];
  const markets = Array.isArray(container.markets) ? container.markets as JsonObject[] : [];
  const news = Array.isArray(container.news) ? container.news as JsonObject[] : [];
  const gas = container.gas as JsonObject | undefined;
  const datetime = container.datetime as JsonObject | undefined;
  const btc = prices.find((entry) => entry.key === "BTC")?.value as JsonObject | undefined;
  const eth = prices.find((entry) => entry.key === "ETH")?.value as JsonObject | undefined;
  return [
    `VaraBridge oracle read: ${prices.length} prices, ${markets.length} markets, ${news.length} news items`,
    btc ? `BTC ${btc.price_usd_micro} microUSD (${btc.change_24h_bps} bps)` : undefined,
    eth ? `ETH ${eth.price_usd_micro} microUSD (${eth.change_24h_bps} bps)` : undefined,
    gas ? `gas ${gas.current_fee_micro} micro` : undefined,
    datetime ? `time ${datetime.utc_string}` : undefined
  ].filter(Boolean).join("; ");
}

export function isAuthorizedGrowthRequest(authHeader: string | undefined, secret = process.env.GROWTH_API_SECRET) {
  if (!secret || !authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length);
  const tokenHash = createHash("sha256").update(token).digest();
  const secretHash = createHash("sha256").update(secret).digest();
  return timingSafeEqual(tokenHash, secretHash);
}

export async function runGrowthCycle(options: GrowthCycleOptions = {}): Promise<GrowthCycleResult> {
  const root = repoRoot(options);
  const state = readJson<JsonObject>(root, RELATIVE_STATE_PATH, {});
  const loopIntervalMs = intervalMs("GROWTH_LOOP_INTERVAL_MS", 15 * 60 * 1000);
  if (!due(state, "lastCycleAt", loopIntervalMs, options)) {
    return {
      ok: true,
      skipped: true,
      nextCycleDueInSeconds: nextDueSeconds(state, loopIntervalMs, options)
    };
  }

  const ids = resolveProgramIds(root);
  assertLiveV2Ids(ids);

  const economicIntervalMs = intervalMs("GROWTH_ECONOMIC_INTERVAL_MS", 6 * 60 * 60 * 1000);
  const boardIntervalMs = intervalMs("GROWTH_BOARD_INTERVAL_MS", 60 * 60 * 1000);
  const externalIntegrationIntervalMs = intervalMs("GROWTH_EXTERNAL_INTEGRATION_INTERVAL_MS", 2 * 60 * 60 * 1000);
  const paidRecommendationValue = process.env.PAID_RECOMMENDATION_VALUE ?? "0.01";
  const subscriptionValue = process.env.PULSE_VALUE ?? "0.025";
  const paymentRaw = process.env.GROWTH_PAYMENT_RAW ?? "10000000000";

  const cycle: JsonObject = {
    startedAt: new Date(now(options)).toISOString(),
    programIds: ids,
    receipts: {}
  };
  const receipts = cycle.receipts as JsonObject;

  const reportReceipt = callNoArgs(root, ids.core, "Core/ReportForBroadcast", agents.core.idl);
  const report = unwrap(reportReceipt) as JsonObject;
  receipts.coreReportForBroadcast = reportReceipt;

  receipts.broadcastConsumeReport = call(root, ids.broadcast, "Broadcast/ConsumeCoreReport", [report], agents.broadcast.idl);
  receipts.broadcastPublishTrend = callNoArgs(root, ids.broadcast, "Broadcast/PublishTrendSummary", agents.broadcast.idl);
  receipts.broadcastDemandFeedback = call(
    root,
    ids.broadcast,
    "Broadcast/TriggerDemandFeedback",
    ["Analytics", 2, "low-frequency autonomous demand pulse from a2a-radar-broadcast-v2"],
    agents.broadcast.idl
  );

  receipts.coreDemandRecalc = call(
    root,
    ids.core,
    "Core/IngestEvent",
    ["DemandRequest", ids.broadcast, "Analytics", null, 2, "broadcast-v2 demand feedback"],
    agents.core.idl
  );

  const premiumReceipt = call(root, ids.core, "Core/PremiumSignalsForMarket", [3], agents.core.idl);
  const premiumSignals = unwrap(premiumReceipt) as unknown[];
  receipts.corePremiumSignals = premiumReceipt;
  receipts.marketPackageSignals = premiumSignals.length > 0
    ? call(root, ids.market, "Market/PackageCoreSignals", [premiumSignals], agents.market.idl)
    : { skipped: true, reason: "Core returned no premium signals" };

  receipts.marketPaidRecommendation = call(
    root,
    ids.market,
    "Market/PaidIntegrationRecommendation",
    [ids.broadcast, "Analytics", "Broadcast is the best coordination surface for current Analytics demand."],
    agents.market.idl,
    ["--value", paidRecommendationValue]
  );

  receipts.corePurchaseReport = call(
    root,
    ids.core,
    "Core/IngestEvent",
    ["Payment", ids.market, "Marketplace", { amount: paymentRaw, asset: "VARA" }, 3, "market-v2 paid integration recommendation purchase"],
    agents.core.idl
  );

  if (due(state, "lastVaraBridgeAt", externalIntegrationIntervalMs, options)) {
    const bridgeReceipt = call(root, VARABRIDGE.programId, "VaraBridge/QueryAndReply", [VARABRIDGE.query], VARABRIDGE.idl);
    const bridgeReply = unwrap(bridgeReceipt) as JsonObject;
    const bridgeSummary = summarizeBridgeReply(bridgeReply);
    receipts.varaBridgeQuery = bridgeReceipt;
    receipts.coreVaraBridgeIngest = call(
      root,
      ids.core,
      "Core/IngestEvent",
      ["ProviderResponse", VARABRIDGE.programId, "Oracle", null, 3, bridgeSummary],
      agents.core.idl
    );
    receipts.broadcastVaraBridgeAnnounce = call(
      root,
      ids.broadcast,
      "Broadcast/AnnounceIntegration",
      [VARABRIDGE.programId, bridgeSummary],
      agents.broadcast.idl
    );
    state.lastVaraBridgeAt = now(options);
  } else {
    receipts.varaBridgeQuery = { skipped: true, reason: "external integration interval not due" };
  }

  let subscriptions = 0;
  if (due(state, "lastEconomicAt", economicIntervalMs, options)) {
    receipts.marketSubscription = call(
      root,
      ids.market,
      "Market/OpenSubscription",
      ["Pulse", ["DemandSpikes", "IntegrationOpportunities"], 1],
      agents.market.idl,
      ["--value", subscriptionValue]
    );
    receipts.coreSubscriptionReport = call(
      root,
      ids.core,
      "Core/IngestEvent",
      ["Payment", ids.market, "Marketplace", { amount: "25000000000", asset: "VARA" }, 4, "market-v2 pulse subscription renewal"],
      agents.core.idl
    );
    state.lastEconomicAt = now(options);
    subscriptions = 1;
  } else {
    receipts.marketSubscription = { skipped: true, reason: "economic interval not due" };
  }

  if (due(state, "lastBoardAt", boardIntervalMs, options)) {
    const reportWithBothCases = report as {
      hot_clusters?: Array<{ label?: string }>;
      hotClusters?: Array<{ label?: string }>;
      top_agents?: Array<{ handle?: string }>;
      topAgents?: Array<{ handle?: string }>;
    };
    const hotCluster = reportWithBothCases.hot_clusters?.[0]?.label ?? reportWithBothCases.hotClusters?.[0]?.label ?? "live demand";
    const topAgent = reportWithBothCases.top_agents?.[0]?.handle ?? reportWithBothCases.topAgents?.[0]?.handle ?? "forming";
    receipts.boardAnnouncement = boardPost(
      root,
      ids.broadcast,
      "A2A Radar leaderboard pulse",
      `Core report refreshed. Top agent: ${topAgent}. Hottest cluster: ${hotCluster}. Market is packaging low-cost premium signals from live demand.`,
      ["a2a-radar", "leaderboard", "ecosystem-pulse"]
    );
    state.lastBoardAt = now(options);
  } else {
    receipts.boardAnnouncement = { skipped: true, reason: "board interval not due" };
  }

  state.lastCycleAt = now(options);
  cycle.completedAt = new Date(now(options)).toISOString();
  appendReceipt(root, cycle);
  writeJson(root, RELATIVE_STATE_PATH, state);

  return {
    ok: true,
    skipped: false,
    callsExecuted: countExecuted(receipts),
    treasuryDelta: treasuryDelta(receipts),
    subscriptions,
    boardAnnouncementId: boardAnnouncementId(receipts),
    receiptsPath: RELATIVE_RECEIPTS_PATH
  };
}
