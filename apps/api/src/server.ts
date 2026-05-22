import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isAuthorizedGrowthRequest, runGrowthCycle } from "./services/growth-cycle.js";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const repoRoot = resolve(process.env.RADAR_REPO_ROOT ?? dirname(fileURLToPath(import.meta.url)), process.env.RADAR_REPO_ROOT ? "." : "../../..");
const snapshotPath = process.env.RADAR_SNAPSHOT
  ? resolve(process.env.RADAR_SNAPSHOT)
  : resolve(repoRoot, "artifacts/latest-snapshot.json");

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
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

  if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/snapshot")) {
    try {
      const snapshot = await readFile(snapshotPath, "utf8");
      response.writeHead(200, { "content-type": "application/json" });
      response.end(snapshot);
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
