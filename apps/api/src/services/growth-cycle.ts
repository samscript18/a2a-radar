import { spawnSync } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

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
  ignoreCycleCooldown?: boolean;
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

const HY4_PREDICT = {
  programId: "0xd24f2886dcb29dec16fc53214b7c8e498b2e96ea55d31a1497571e1ae15f5271",
  idl: "integrations/hy4-predict/hy4_predict.idl",
  marketId: 0
} as const;

const THEBOOKDEX = {
  programId: "0x7fa1988c57ba1134e2461c5fb36bc13d66c1dfbf47d36c5e9960b9ca2dc0e4c4",
  idl: "integrations/thebookdex/thebook.idl",
  orderbookAsset: { ETH: null }
} as const;

const VARA_STRATEGY = {
  programId: "0xe6483fe2fc8fea2dc3e2ee848e0372b9b486e023bb4cb21247a914e8f074aaa7",
  idl: "integrations/vara-trinity/vara_strategy.idl"
} as const;

const VARA_FLOW = {
  programId: "0x19d4b1778cfdf64c732e10640ccff923c4137a7fbed4f1a291e241d3e6361175",
  idl: "integrations/vara-trinity/vara_flow.idl"
} as const;

const VARA_PULSE = {
  programId: "0x51321d7e10b5fa064b6cad675216634336ca2de0e27d0940d184f1548d55f53d",
  idl: "integrations/vara-trinity/vara_pulse.idl"
} as const;

const AGENT_PULSE = {
  programId: "0x61219b6e1a0724ac67c2e1133e6c5aaaddbfb88a0b457f93e6b94e02bdb27e6b",
  idl: "integrations/agent-pulse/agent_pulse.idl"
} as const;

const INFINITE_BOUNTY = {
  programId: "0x747d09594538498f2c64ae91f93131a47b0ce8abaa80a54e37d7a6badadc15e8",
  idl: "integrations/infinite-bounties/infinite_bounties.idl"
} as const;

const A2A_REPUTATION = {
  programId: "0x3c006c9daf828aa6dd237c012ea683335ffb2d455e443d7d9ab3593612f30775",
  idl: "integrations/a2a-reputation/agent.idl"
} as const;

function repoRoot(options: GrowthCycleOptions = {}) {
  return resolve(options.repoRoot ?? process.cwd());
}

function absolute(root: string, path: string) {
  return resolve(root, path);
}

function resolveRuntimePath(root: string, path: string | undefined) {
  if (!path) return undefined;
  return isAbsolute(path) ? path : resolve(root, path);
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

function operatorAccount(root: string) {
  const fromEnv = process.env.OPERATOR_HEX;
  if (fromEnv?.startsWith("0x")) return fromEnv;

  const wallet = readJson<{ address?: string; addressHex?: string }>(root, "artifacts/deploy/wallet-status.json", {});
  const fromFile = wallet.address ?? wallet.addressHex;
  if (fromFile?.startsWith("0x")) return fromFile;

  const balance = runJson(root, varaWalletArgs(["balance"]));
  const fromWallet = typeof balance.address === "string" ? balance.address : undefined;
  if (fromWallet?.startsWith("0x")) return fromWallet;

  throw new Error("Cannot refresh voucher: missing operator hex. Set OPERATOR_HEX or ensure the Render wallet import succeeded.");
}

async function requestVoucher(root: string, programId: string) {
  const account = operatorAccount(root);
  const voucherUrl = process.env.VOUCHER_URL ?? "https://voucher-backend-agents.vara.network/voucher";
  const response = await fetch(voucherUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ account, programs: [programId] })
  });
  const body = await response.json().catch(() => ({})) as { voucherId?: string; error?: string };

  if (![200, 201, 429].includes(response.status)) {
    throw new Error(`Voucher refresh failed with HTTP ${response.status}${body.error ? `: ${body.error}` : ""}`);
  }
  if (!body.voucherId) {
    throw new Error(`Voucher refresh did not return a voucher id for operator ${account}`);
  }

  const result = {
    account,
    pid: programId,
    voucherUrl,
    voucherId: body.voucherId,
    state: { ...body, httpStatus: response.status },
    generatedAt: new Date().toISOString()
  };
  process.env.VOUCHER_ID = body.voucherId;
  writeJson(root, "artifacts/deploy/voucher.json", result);
  return body.voucherId;
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

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function isTxPoolPriorityError(message: string) {
  return /Priority is too low|too low priority to replace another transaction/i.test(message);
}

function runJson(root: string, args: string[]) {
  const maxAttempts = Number(process.env.VARA_WALLET_TX_RETRIES ?? 4);
  const baseDelayMs = Number(process.env.VARA_WALLET_TX_RETRY_DELAY_MS ?? 4_000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = spawnSync("vara-wallet", ["--json", ...args], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    });
    if (result.status === 0) {
      return parseJsonOutput(result.stdout ?? "");
    }

    const details = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    if (attempt < maxAttempts && isTxPoolPriorityError(details)) {
      const delayMs = baseDelayMs * attempt;
      console.warn(`vara-wallet tx pool priority conflict; retrying in ${delayMs}ms (${attempt}/${maxAttempts})`);
      sleepSync(delayMs);
      continue;
    }

    throw new Error(`vara-wallet ${args.join(" ")} failed${details ? `: ${details}` : ""}`);
  }

  throw new Error(`vara-wallet ${args.join(" ")} failed`);
}

function isVoucherExpiredError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("VOUCHER_EXPIRED") || /Voucher expired/i.test(message);
}

function isFieldTooLargeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /FieldTooLarge/i.test(message);
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

function runBoardPost(root: string, boardPid: string, boardIdl: string, app: string, title: string, body: string, tags: string[]) {
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

async function boardPost(root: string, app: string, title: string, body: string, tags: string[]) {
  const boardPid = process.env.BOARD_PID ?? process.env.REGISTRY_PID;
  const boardIdl = resolveRuntimePath(root, process.env.BOARD_IDL ?? process.env.REGISTRY_IDL ?? process.env.IDL);
  if (!boardPid || !boardIdl) {
    return { skipped: true, reason: "BOARD_PID and BOARD_IDL/IDL not set" };
  }
  if (!existsSync(boardIdl)) {
    throw new Error(`BOARD_IDL file does not exist: ${boardIdl}`);
  }
  try {
    return runBoardPost(root, boardPid, boardIdl, app, title, body, tags);
  } catch (error) {
    if (isFieldTooLargeError(error)) {
      return runBoardPost(
        root,
        boardPid,
        boardIdl,
        app,
        "A2A Radar endpoints open",
        "A2A Radar is live on Vara. Builders can call Core for rankings, reputation, demand signals, and integration suggestions. Market supports Pulse subscriptions at 0.025 VARA. Docs/API: https://a2a-radar.onrender.com/api/discover",
        ["a2a-radar", "integration"]
      );
    }
    if (isVoucherExpiredError(error)) {
      if (process.env.VOUCHER_AUTO_REFRESH === "0") {
        return {
          skipped: true,
          reason: "VOUCHER_EXPIRED",
          action: "Set VOUCHER_AUTO_REFRESH=1 or refresh VOUCHER_ID before Board writes can resume."
        };
      }
      await requestVoucher(root, boardPid);
      return runBoardPost(root, boardPid, boardIdl, app, title, body, tags);
    }
    throw error;
  }
}

function countExecuted(receipts: JsonObject) {
  return Object.values(receipts).filter((receipt) => {
    if (!receipt || typeof receipt !== "object") return false;
    return "messageId" in receipt || "txHash" in receipt;
  }).length;
}

function receiptError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    failed: true,
    error: message.slice(0, 900)
  };
}

function runBestEffortIntegration(receipts: JsonObject, errorKey: string, run: () => void) {
  try {
    run();
    return true;
  } catch (error) {
    receipts[errorKey] = receiptError(error);
    console.error(`[growth-cycle] ${errorKey} failed`, error instanceof Error ? error.message : error);
    return false;
  }
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

function summarizeHy4Predict(currentBlock: unknown, fastMarketReply: unknown) {
  const container = fastMarketReply && typeof fastMarketReply === "object"
    ? ((fastMarketReply as JsonObject).value as JsonObject | undefined) ?? fastMarketReply as JsonObject
    : undefined;
  if (!container) {
    return `hy4-predict FastMarket read: current block ${String(currentBlock)}; selected market not available.`;
  }

  const statusContainer = container.status;
  const status = typeof statusContainer === "string"
    ? statusContainer
    : statusContainer && typeof statusContainer === "object"
      ? Object.keys(statusContainer as JsonObject)[0] ?? "Unknown"
      : "Unknown";
  const question = String(container.question ?? `FastMarket ${HY4_PREDICT.marketId}`);
  const symbol = String(container.symbol ?? "unknown");
  const openPrice = String(container.open_price_micro_usd ?? container.openPriceMicroUsd ?? "0");
  const resolveAfter = Number(container.resolve_after_block ?? container.resolveAfterBlock ?? 0);
  const block = Number(currentBlock ?? 0);
  const blocksRemaining = Math.max(0, resolveAfter - block);

  return [
    `hy4-predict FastMarket read: ${question}`,
    `symbol ${symbol}`,
    `status ${status}`,
    `open ${openPrice} microUSD`,
    `blocks remaining ${blocksRemaining}`
  ].join("; ");
}

function tupleLength(value: unknown, index: number) {
  const item = Array.isArray(value) ? value[index] : undefined;
  return Array.isArray(item) ? item.length : 0;
}

function summarizeTheBookDex(statusReply: unknown, orderbookReply: unknown, poolsReply: unknown) {
  const statusText = Array.isArray(statusReply)
    ? `status ${statusReply.join("/")}`
    : `status ${JSON.stringify(statusReply ?? "unknown")}`;
  const bids = tupleLength(orderbookReply, 0);
  const asks = tupleLength(orderbookReply, 1);
  const poolCount = Array.isArray(poolsReply) ? poolsReply.length : 0;
  return [
    "thebookdex DEX read",
    statusText,
    `ETH book ${bids} bids / ${asks} asks`,
    `${poolCount} AMM pools`
  ].join("; ");
}

function summarizeVaraStrategy(statsReply: unknown, recommendationsReply: unknown) {
  const stats = statsReply && typeof statsReply === "object" ? statsReply as JsonObject : {};
  const recommendations = Array.isArray(recommendationsReply) ? recommendationsReply as JsonObject[] : [];
  const top = recommendations[0];
  return [
    "VaraStrategy signal read",
    `analyzed ${String(stats.total_analyzed ?? stats.totalAnalyzed ?? 0)}`,
    `posted ${String(stats.total_posted ?? stats.totalPosted ?? 0)}`,
    `recommendations ${String(stats.recommendations_count ?? stats.recommendationsCount ?? recommendations.length)}`,
    top ? `top: ${String(top.title ?? top.rec_type ?? "strategy recommendation")}` : "top: none"
  ].join("; ");
}

function summarizeVaraFlow(statsReply: unknown, workflowsReply: unknown) {
  const stats = statsReply && typeof statsReply === "object" ? statsReply as JsonObject : {};
  const workflows = Array.isArray(workflowsReply) ? workflowsReply as JsonObject[] : [];
  return [
    "VaraFlow workflow read",
    `workflows ${String(stats.workflow_count ?? stats.workflowCount ?? workflows.length)}`,
    `active ${String(stats.active_workflows ?? stats.activeWorkflows ?? workflows.filter((item) => item.active === true).length)}`,
    `executions ${String(stats.execution_count ?? stats.executionCount ?? 0)}`,
    `broadcasts ${String(stats.broadcast_count ?? stats.broadcastCount ?? 0)}`
  ].join("; ");
}

function summarizeVaraPulse(statsReply: unknown, latestPulseReply: unknown) {
  const stats = statsReply && typeof statsReply === "object" ? statsReply as JsonObject : {};
  const latest = latestPulseReply && typeof latestPulseReply === "object"
    ? ((latestPulseReply as JsonObject).value as JsonObject | undefined) ?? latestPulseReply as JsonObject
    : undefined;
  return [
    "VaraPulse social pulse read",
    `pulses ${String(stats.total_pulses ?? stats.totalPulses ?? 0)}`,
    `nudges ${String(stats.total_nudges ?? stats.totalNudges ?? 0)}`,
    `board posts ${String(stats.total_board_posts ?? stats.totalBoardPosts ?? 0)}`,
    latest ? `latest: ${String(latest.body ?? "pulse available").slice(0, 96)}` : "latest: none"
  ].join("; ");
}

function summarizeAgentPulse(statsReply: unknown, feedReply: unknown) {
  const stats = statsReply && typeof statsReply === "object" ? statsReply as JsonObject : {};
  const feed = Array.isArray(feedReply) ? feedReply as JsonObject[] : [];
  const latest = feed[0];
  return [
    "Agent Pulse feed read",
    `posts ${String(stats.total_posts ?? stats.totalPosts ?? feed.length)}`,
    `authors ${String(stats.unique_authors ?? stats.uniqueAuthors ?? 0)}`,
    `feed sample ${feed.length}`,
    latest ? `latest: ${String(latest.content ?? "pulse post").slice(0, 96)}` : "latest: none"
  ].join("; ");
}

function summarizeInfiniteBounty(configReply: unknown, openBountiesReply: unknown) {
  const config = configReply && typeof configReply === "object" ? configReply as JsonObject : {};
  const page = openBountiesReply && typeof openBountiesReply === "object" ? openBountiesReply as JsonObject : {};
  const bounties = Array.isArray(page.bounties) ? page.bounties as JsonObject[] : [];
  const top = bounties[0];
  return [
    "Infinite Bounty board read",
    `bounty count ${String(config.bounty_count ?? config.bountyCount ?? bounties.length)}`,
    `open sample ${bounties.length}`,
    top ? `top: ${String(top.description ?? "open bounty").slice(0, 96)}` : "top: none"
  ].join("; ");
}

function summarizeA2aReputation(statusReply: unknown, leaderboardReply: unknown) {
  const leaderboard = Array.isArray(leaderboardReply) ? leaderboardReply as JsonObject[] : [];
  const top = leaderboard[0];
  const status = typeof statusReply === "string"
    ? statusReply
    : statusReply && typeof statusReply === "object"
      ? Object.keys(statusReply as JsonObject)[0] ?? "unknown"
      : String(statusReply ?? "unknown");
  return [
    "A2A Reputation oracle read",
    `status ${status}`,
    `leaderboard sample ${leaderboard.length}`,
    top ? `top: ${String(top.agent ?? "agent")} (${String(top.oracle_points ?? top.oraclePoints ?? 0)} pts)` : "top: none"
  ].join("; ");
}

function categoryLabel(value: unknown) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "live demand";
  const key = Object.keys(value as JsonObject)[0];
  return key ? `${key[0]?.toUpperCase() ?? ""}${key.slice(1)}` : "live demand";
}

const BOARD_ANNOUNCEMENT_BODY_MAX = 900;

function shortId(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function trimBoardField(value: string, max = BOARD_ANNOUNCEMENT_BODY_MAX) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 12)).trimEnd()}\n[more: /api/discover]`;
}

function buildBoardAnnouncement(report: JsonObject, ids: Record<ProgramKey, string>) {
  const hotClusters = (report.hot_clusters ?? report.hotClusters) as JsonObject[] | undefined;
  const opportunities = report.opportunities as JsonObject[] | undefined;
  const topAgents = (report.top_agents ?? report.topAgents) as JsonObject[] | undefined;
  const hotCluster = hotClusters?.[0];
  const opportunity = opportunities?.[0];
  const topAgent = topAgents?.[0];
  const clusterLabel = String(hotCluster?.label ?? opportunity?.title ?? "live Vara agent demand");
  const category = categoryLabel(hotCluster?.category ?? opportunity?.category);
  const demandScore = String(hotCluster?.demand_score ?? hotCluster?.demandScore ?? opportunity?.demand_score ?? opportunity?.demandScore ?? "forming");
  const topAgentHandle = String(topAgent?.handle ?? "open ecosystem slot");

  return {
    title: "A2A Radar integration beacon: endpoints open",
    body: trimBoardField([
      "A2A Radar is live and accepting agent integrations.",
      "",
      `Trend: ${clusterLabel}`,
      `Category: ${category}`,
      `Demand score: ${demandScore}`,
      `Top observed agent: ${topAgentHandle}`,
      "",
      "Builder endpoints:",
      `Core ${shortId(ids.core)}`,
      "Ranking, ReputationScore, DemandSignals, IntegrationSuggestions, EcosystemReport, PremiumSignalsForMarket",
      "",
      `Market ${shortId(ids.market)}`,
      "OpenSubscription(Pulse, DemandSpikes + IntegrationOpportunities) value: 0.025 VARA",
      "PaidIntegrationRecommendation value: 0.01 VARA",
      "",
      "To integrate:",
      "1. Call Core or Market from your Vara app/operator wallet.",
      "2. Include your handle + program ID for attribution.",
      "3. Post a Chat/Board request so Broadcast can announce it.",
      "",
      "Off-chain agents can read https://a2a-radar.onrender.com/snapshot and /api/discover. On-chain scoring still requires a Vara wallet/app call."
    ].join("\n")),
    tags: ["a2a-radar", "integration", "market"]
  };
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
  const oneMinuteMs = 60 * 1000;
  const loopIntervalMs = intervalMs("GROWTH_LOOP_INTERVAL_MS", oneMinuteMs);
  if (!options.ignoreCycleCooldown && !due(state, "lastCycleAt", loopIntervalMs, options)) {
    return {
      ok: true,
      skipped: true,
      nextCycleDueInSeconds: nextDueSeconds(state, loopIntervalMs, options)
    };
  }

  const ids = resolveProgramIds(root);
  assertLiveV2Ids(ids);

  const economicIntervalMs = intervalMs("GROWTH_ECONOMIC_INTERVAL_MS", oneMinuteMs);
  const boardIntervalMs = intervalMs("GROWTH_BOARD_INTERVAL_MS", 10 * 60 * 1000);
  const externalIntegrationIntervalMs = intervalMs("GROWTH_EXTERNAL_INTEGRATION_INTERVAL_MS", oneMinuteMs);
  const predictionIntegrationIntervalMs = intervalMs("GROWTH_PREDICTION_INTEGRATION_INTERVAL_MS", oneMinuteMs);
  const dexIntegrationIntervalMs = intervalMs("GROWTH_DEX_INTEGRATION_INTERVAL_MS", oneMinuteMs);
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
    const ok = runBestEffortIntegration(receipts, "varaBridgeIntegrationError", () => {
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
    });
    if (ok) state.lastVaraBridgeAt = now(options);
  } else {
    receipts.varaBridgeQuery = { skipped: true, reason: "external integration interval not due" };
  }

  if (due(state, "lastHy4PredictAt", predictionIntegrationIntervalMs, options)) {
    const ok = runBestEffortIntegration(receipts, "hy4PredictIntegrationError", () => {
      const currentBlockReceipt = callNoArgs(root, HY4_PREDICT.programId, "FastMarket/CurrentBlock", HY4_PREDICT.idl);
      const currentBlock = unwrap(currentBlockReceipt);
      const fastMarketReceipt = call(root, HY4_PREDICT.programId, "FastMarket/FastMarket", [HY4_PREDICT.marketId], HY4_PREDICT.idl);
      const fastMarket = unwrap(fastMarketReceipt);
      const hy4Summary = summarizeHy4Predict(currentBlock, fastMarket);
      receipts.hy4PredictCurrentBlock = currentBlockReceipt;
      receipts.hy4PredictFastMarket = fastMarketReceipt;
      receipts.coreHy4PredictIngest = call(
        root,
        ids.core,
        "Core/IngestEvent",
        ["ProviderResponse", HY4_PREDICT.programId, "Prediction", null, 3, hy4Summary],
        agents.core.idl
      );
      receipts.broadcastHy4PredictAnnounce = call(
        root,
        ids.broadcast,
        "Broadcast/AnnounceIntegration",
        [HY4_PREDICT.programId, hy4Summary],
        agents.broadcast.idl
      );
    });
    if (ok) state.lastHy4PredictAt = now(options);
  } else {
    receipts.hy4PredictFastMarket = { skipped: true, reason: "prediction integration interval not due" };
  }

  if (due(state, "lastTheBookDexAt", dexIntegrationIntervalMs, options)) {
    const ok = runBestEffortIntegration(receipts, "theBookDexIntegrationError", () => {
      receipts.theBookDexSignalCollab = call(
        root,
        THEBOOKDEX.programId,
        "Orderbook/SignalCollab",
        [ids.market, "A2A Radar is indexing thebookdex market depth for ecosystem intelligence."],
        THEBOOKDEX.idl
      );
      const statusReceipt = callNoArgs(root, THEBOOKDEX.programId, "Orderbook/GetStatus", THEBOOKDEX.idl);
      const orderbookReceipt = call(root, THEBOOKDEX.programId, "Orderbook/GetOrderbook", [THEBOOKDEX.orderbookAsset], THEBOOKDEX.idl);
      const poolsReceipt = callNoArgs(root, THEBOOKDEX.programId, "Amm/ListPools", THEBOOKDEX.idl);
      const dexSummary = summarizeTheBookDex(unwrap(statusReceipt), unwrap(orderbookReceipt), unwrap(poolsReceipt));
      receipts.theBookDexStatus = statusReceipt;
      receipts.theBookDexOrderbook = orderbookReceipt;
      receipts.theBookDexPools = poolsReceipt;
      receipts.coreTheBookDexIngest = call(
        root,
        ids.core,
        "Core/IngestEvent",
        ["ProviderResponse", THEBOOKDEX.programId, "Marketplace", null, 3, dexSummary],
        agents.core.idl
      );
      receipts.broadcastTheBookDexAnnounce = call(
        root,
        ids.broadcast,
        "Broadcast/AnnounceIntegration",
        [THEBOOKDEX.programId, dexSummary],
        agents.broadcast.idl
      );
    });
    if (ok) state.lastTheBookDexAt = now(options);
  } else {
    receipts.theBookDexSignalCollab = { skipped: true, reason: "DEX integration interval not due" };
  }

  if (due(state, "lastVaraStrategyAt", externalIntegrationIntervalMs, options)) {
    const ok = runBestEffortIntegration(receipts, "varaStrategyIntegrationError", () => {
      const strategyStatsReceipt = callNoArgs(root, VARA_STRATEGY.programId, "VaraStrategy/GetStats", VARA_STRATEGY.idl);
      const strategyRecommendationsReceipt = call(root, VARA_STRATEGY.programId, "VaraStrategy/GetRecommendations", [3], VARA_STRATEGY.idl);
      const strategySummary = summarizeVaraStrategy(unwrap(strategyStatsReceipt), unwrap(strategyRecommendationsReceipt));
      receipts.varaStrategyStats = strategyStatsReceipt;
      receipts.varaStrategyRecommendations = strategyRecommendationsReceipt;
      receipts.coreVaraStrategyIngest = call(
        root,
        ids.core,
        "Core/IngestEvent",
        ["ProviderResponse", VARA_STRATEGY.programId, "Marketplace", null, 3, strategySummary],
        agents.core.idl
      );
      receipts.broadcastVaraStrategyAnnounce = call(
        root,
        ids.broadcast,
        "Broadcast/AnnounceIntegration",
        [VARA_STRATEGY.programId, strategySummary],
        agents.broadcast.idl
      );
    });
    if (ok) state.lastVaraStrategyAt = now(options);
  } else {
    receipts.varaStrategyStats = { skipped: true, reason: "VaraStrategy integration interval not due" };
  }

  if (due(state, "lastVaraFlowAt", externalIntegrationIntervalMs, options)) {
    const ok = runBestEffortIntegration(receipts, "varaFlowIntegrationError", () => {
      const flowStatsReceipt = callNoArgs(root, VARA_FLOW.programId, "VaraFlow/GetStats", VARA_FLOW.idl);
      const flowWorkflowsReceipt = call(root, VARA_FLOW.programId, "VaraFlow/ListWorkflows", [null, true], VARA_FLOW.idl);
      const flowSummary = summarizeVaraFlow(unwrap(flowStatsReceipt), unwrap(flowWorkflowsReceipt));
      receipts.varaFlowStats = flowStatsReceipt;
      receipts.varaFlowWorkflows = flowWorkflowsReceipt;
      receipts.coreVaraFlowIngest = call(
        root,
        ids.core,
        "Core/IngestEvent",
        ["ProviderResponse", VARA_FLOW.programId, "Analytics", null, 3, flowSummary],
        agents.core.idl
      );
      receipts.broadcastVaraFlowAnnounce = call(
        root,
        ids.broadcast,
        "Broadcast/AnnounceIntegration",
        [VARA_FLOW.programId, flowSummary],
        agents.broadcast.idl
      );
    });
    if (ok) state.lastVaraFlowAt = now(options);
  } else {
    receipts.varaFlowStats = { skipped: true, reason: "VaraFlow integration interval not due" };
  }

  if (due(state, "lastVaraPulseAt", externalIntegrationIntervalMs, options)) {
    const ok = runBestEffortIntegration(receipts, "varaPulseIntegrationError", () => {
      const pulseStatsReceipt = callNoArgs(root, VARA_PULSE.programId, "VaraPulse/GetStats", VARA_PULSE.idl);
      const pulseLatestReceipt = callNoArgs(root, VARA_PULSE.programId, "VaraPulse/GetLatestPulse", VARA_PULSE.idl);
      const pulseSummary = summarizeVaraPulse(unwrap(pulseStatsReceipt), unwrap(pulseLatestReceipt));
      receipts.varaPulseStats = pulseStatsReceipt;
      receipts.varaPulseLatest = pulseLatestReceipt;
      receipts.coreVaraPulseIngest = call(
        root,
        ids.core,
        "Core/IngestEvent",
        ["ProviderResponse", VARA_PULSE.programId, "Social", null, 3, pulseSummary],
        agents.core.idl
      );
      receipts.broadcastVaraPulseAnnounce = call(
        root,
        ids.broadcast,
        "Broadcast/AnnounceIntegration",
        [VARA_PULSE.programId, pulseSummary],
        agents.broadcast.idl
      );
    });
    if (ok) state.lastVaraPulseAt = now(options);
  } else {
    receipts.varaPulseStats = { skipped: true, reason: "VaraPulse integration interval not due" };
  }

  if (due(state, "lastAgentPulseAt", externalIntegrationIntervalMs, options)) {
    const ok = runBestEffortIntegration(receipts, "agentPulseIntegrationError", () => {
      const pulseStatsReceipt = callNoArgs(root, AGENT_PULSE.programId, "PulseService/GetStats", AGENT_PULSE.idl);
      const pulseFeedReceipt = call(root, AGENT_PULSE.programId, "PulseService/GetFeed", [5], AGENT_PULSE.idl);
      const pulseSummary = summarizeAgentPulse(unwrap(pulseStatsReceipt), unwrap(pulseFeedReceipt));
      receipts.agentPulseStats = pulseStatsReceipt;
      receipts.agentPulseFeed = pulseFeedReceipt;
      receipts.coreAgentPulseIngest = call(
        root,
        ids.core,
        "Core/IngestEvent",
        ["ProviderResponse", AGENT_PULSE.programId, "Social", null, 3, pulseSummary],
        agents.core.idl
      );
      receipts.broadcastAgentPulseAnnounce = call(
        root,
        ids.broadcast,
        "Broadcast/AnnounceIntegration",
        [AGENT_PULSE.programId, pulseSummary],
        agents.broadcast.idl
      );
    });
    if (ok) state.lastAgentPulseAt = now(options);
  } else {
    receipts.agentPulseStats = { skipped: true, reason: "Agent Pulse integration interval not due" };
  }

  if (due(state, "lastInfiniteBountyAt", externalIntegrationIntervalMs, options)) {
    const ok = runBestEffortIntegration(receipts, "infiniteBountyIntegrationError", () => {
      const bountyConfigReceipt = callNoArgs(root, INFINITE_BOUNTY.programId, "BountyBoard/GetConfig", INFINITE_BOUNTY.idl);
      const openBountiesReceipt = call(root, INFINITE_BOUNTY.programId, "BountyBoard/GetBountiesByStatus", ["Open", null, 5], INFINITE_BOUNTY.idl);
      const bountySummary = summarizeInfiniteBounty(unwrap(bountyConfigReceipt), unwrap(openBountiesReceipt));
      receipts.infiniteBountyConfig = bountyConfigReceipt;
      receipts.infiniteBountyOpen = openBountiesReceipt;
      receipts.coreInfiniteBountyIngest = call(
        root,
        ids.core,
        "Core/IngestEvent",
        ["ProviderResponse", INFINITE_BOUNTY.programId, "Marketplace", null, 3, bountySummary],
        agents.core.idl
      );
      receipts.broadcastInfiniteBountyAnnounce = call(
        root,
        ids.broadcast,
        "Broadcast/AnnounceIntegration",
        [INFINITE_BOUNTY.programId, bountySummary],
        agents.broadcast.idl
      );
    });
    if (ok) state.lastInfiniteBountyAt = now(options);
  } else {
    receipts.infiniteBountyConfig = { skipped: true, reason: "Infinite Bounty integration interval not due" };
  }

  if (due(state, "lastA2aReputationAt", externalIntegrationIntervalMs, options)) {
    const ok = runBestEffortIntegration(receipts, "a2aReputationIntegrationError", () => {
      const reputationStatusReceipt = callNoArgs(root, A2A_REPUTATION.programId, "ReputationOracle/OracleStatus", A2A_REPUTATION.idl);
      const reputationLeaderboardReceipt = call(root, A2A_REPUTATION.programId, "ReputationOracle/EconomicLeaderboard", [5], A2A_REPUTATION.idl);
      const reputationSummary = summarizeA2aReputation(unwrap(reputationStatusReceipt), unwrap(reputationLeaderboardReceipt));
      receipts.a2aReputationStatus = reputationStatusReceipt;
      receipts.a2aReputationLeaderboard = reputationLeaderboardReceipt;
      receipts.coreA2aReputationIngest = call(
        root,
        ids.core,
        "Core/IngestEvent",
        ["ProviderResponse", A2A_REPUTATION.programId, "Reputation", null, 3, reputationSummary],
        agents.core.idl
      );
      receipts.broadcastA2aReputationAnnounce = call(
        root,
        ids.broadcast,
        "Broadcast/AnnounceIntegration",
        [A2A_REPUTATION.programId, reputationSummary],
        agents.broadcast.idl
      );
    });
    if (ok) state.lastA2aReputationAt = now(options);
  } else {
    receipts.a2aReputationStatus = { skipped: true, reason: "A2A Reputation integration interval not due" };
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
    const announcement = buildBoardAnnouncement(report, ids);
    receipts.boardAnnouncement = await boardPost(
      root,
      ids.broadcast,
      announcement.title,
      announcement.body,
      announcement.tags
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
