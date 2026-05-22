import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isAuthorizedGrowthRequest, runGrowthCycle } from "./services/growth-cycle.js";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const repoRoot = resolve(process.env.RADAR_REPO_ROOT ?? dirname(fileURLToPath(import.meta.url)), process.env.RADAR_REPO_ROOT ? "." : "../../..");
const snapshotPath = process.env.RADAR_SNAPSHOT
  ? resolve(process.env.RADAR_SNAPSHOT)
  : resolve(repoRoot, "artifacts/latest-snapshot.json");
const growthReceiptsPath = process.env.RADAR_GROWTH_RECEIPTS
  ? resolve(process.env.RADAR_GROWTH_RECEIPTS)
  : resolve(repoRoot, "artifacts/deploy/growth-loop-receipts.json");

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readSnapshot() {
  if (!existsSync(snapshotPath)) {
    runIndexChain();
  }
  return JSON.parse(await readFile(snapshotPath, "utf8")) as Record<string, unknown>;
}

async function readGrowthReceiptSummary() {
  const raw = await readFile(growthReceiptsPath, "utf8");
  const cycles = JSON.parse(raw) as Array<{
    startedAt?: string;
    completedAt?: string;
    receipts?: Record<string, { messageId?: string; txHash?: string; result?: unknown }>;
  }>;
  const latest = cycles.at(-1);
  if (!latest) {
    return {
      exists: false,
      callsExecuted: 0,
      skipped: true,
      boardAnnouncementId: null,
      treasuryDeltaRaw: "0"
    };
  }
  const receipts = latest.receipts ?? {};
  const callsExecuted = Object.values(receipts).filter((receipt) => receipt.messageId || receipt.txHash).length;
  const boardResult = receipts.boardAnnouncement?.result;
  const treasuryDeltaRaw = [
    receipts.marketPaidRecommendation?.messageId ? 10_000_000_000n : 0n,
    receipts.marketSubscription?.messageId ? 25_000_000_000n : 0n
  ].reduce((sum, item) => sum + item, 0n);

  return {
    exists: true,
    startedAt: latest.startedAt,
    completedAt: latest.completedAt,
    callsExecuted,
    skipped: callsExecuted === 0,
    boardAnnouncementId: typeof boardResult === "string" ? boardResult : null,
    treasuryDeltaRaw: treasuryDeltaRaw.toString()
  };
}

function runIndexChain() {
  const result = spawnSync("npm", ["run", "index:chain"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env
  });
  if (result.status !== 0) {
    const details = `${result.stderr ?? ""}${result.stdout ?? ""}`.trim();
    throw new Error(`npm run index:chain failed${details ? `: ${details}` : ""}`);
  }
  return {
    ok: true,
    stdout: result.stdout?.trim() ?? ""
  };
}

function discoverPayload(snapshot: Record<string, unknown>) {
  const leaderboard = Array.isArray(snapshot.leaderboard) ? snapshot.leaderboard : [];
  const clusters = Array.isArray(snapshot.clusters) ? snapshot.clusters : [];
  const opportunities = Array.isArray(snapshot.opportunities) ? snapshot.opportunities : [];
  const partners = Array.isArray(snapshot.partners) ? snapshot.partners : [];
  return {
    ok: true,
    source: "artifacts/latest-snapshot.json",
    routes: [
      {
        name: "GetTopAgents",
        status: leaderboard.length > 0 ? "available" : "coming soon",
        sailsRoute: "Core/Ranking(limit)",
        example: leaderboard.slice(0, 3)
      },
      {
        name: "GetReputation",
        status: leaderboard.length > 0 ? "available" : "coming soon",
        sailsRoute: "Core/ReputationScore(agent)",
        example: leaderboard[0] ?? null
      },
      {
        name: "GetTrendingSignals",
        status: clusters.length > 0 ? "available" : "coming soon",
        sailsRoute: "Core/DemandSignals(limit)",
        example: clusters.slice(0, 3)
      },
      {
        name: "GetIntegrationRecommendations",
        status: partners.length > 0 ? "available" : "coming soon",
        sailsRoute: "Core/IntegrationSuggestions(requester, limit)",
        example: partners.slice(0, 3)
      },
      {
        name: "GetOpportunities",
        status: opportunities.length > 0 ? "available" : "coming soon",
        sailsRoute: "Core/EcosystemReport()",
        example: opportunities.slice(0, 3)
      },
      {
        name: "GetMarketSignals",
        status: clusters.length > 0 ? "available" : "coming soon",
        sailsRoute: "Core/PremiumSignalsForMarket(limit)",
        example: clusters.slice(0, 2)
      }
    ]
  };
}

export async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true, service: "a2a-radar-api" });
    return;
  }

  if (url.pathname === "/api/run-growth-cycle" && request.method !== "POST") {
    sendJson(response, 405, {
      ok: false,
      error: "method_not_allowed",
      message: "Use POST with Authorization: Bearer <GROWTH_API_SECRET>."
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/run-growth-cycle") {
    if (!isAuthorizedGrowthRequest(request.headers.authorization)) {
      sendJson(response, 401, { ok: false, error: "unauthorized" });
      return;
    }

    try {
      const result = await runGrowthCycle({ repoRoot });
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "growth cycle failed"
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/index-chain") {
    if (!isAuthorizedGrowthRequest(request.headers.authorization)) {
      sendJson(response, 401, { ok: false, error: "unauthorized" });
      return;
    }

    try {
      const result = runIndexChain();
      sendJson(response, 200, { ok: true, indexed: true, stdout: result.stdout });
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "chain index failed"
      });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/discover") {
    try {
      sendJson(response, 200, discoverPayload(await readSnapshot()));
    } catch {
      sendJson(response, 503, { ok: false, error: "snapshot unavailable; index real chain events first" });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/growth-receipt") {
    try {
      sendJson(response, 200, await readGrowthReceiptSummary());
    } catch {
      sendJson(response, 503, { ok: false, error: "growth receipt unavailable; run a growth cycle first" });
    }
    return;
  }

  if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/snapshot")) {
    try {
      sendJson(response, 200, await readSnapshot());
    } catch {
      sendJson(response, 503, { ok: false, error: "snapshot unavailable; index real chain events first" });
    }
    return;
  }

  sendJson(response, 404, { ok: false, error: "not found" });
}

if (process.env.NODE_ENV !== "test") {
  createServer(handleRequest).listen(port, host, () => {
    console.log(`A2A Radar API listening on http://${host}:${port}`);
  });
}
