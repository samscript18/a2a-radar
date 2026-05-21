import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT ?? 8787);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const snapshotPath = process.env.RADAR_SNAPSHOT
  ? resolve(process.env.RADAR_SNAPSHOT)
  : resolve(repoRoot, "artifacts/latest-snapshot.json");

const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");

  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "a2a-radar-api" }));
    return;
  }

  if (request.url === "/" || request.url === "/snapshot") {
    try {
      const snapshot = await readFile(snapshotPath, "utf8");
      response.writeHead(200, { "content-type": "application/json" });
      response.end(snapshot);
    } catch {
      response.writeHead(503, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: false, error: "snapshot unavailable; index real chain events first" }));
    }
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ ok: false, error: "not found" }));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`A2A Radar API listening on http://127.0.0.1:${port}`);
});
