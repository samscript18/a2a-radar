import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

process.env.NODE_ENV = "test";
process.env.GROWTH_API_SECRET = "test-secret";

const repoRoot = mkdtempSync(join(tmpdir(), "a2a-radar-growth-api-"));
mkdirSync(join(repoRoot, "artifacts/deploy"), { recursive: true });
writeFileSync(
  join(repoRoot, "artifacts/deploy/growth-loop-state.json"),
  `${JSON.stringify({ lastCycleAt: Date.now() }, null, 2)}\n`,
  "utf8"
);
process.env.RADAR_REPO_ROOT = repoRoot;

const { handleRequest } = await import("../../apps/api/src/server.ts");

function responseRecorder() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    writeHead(status, headers = {}) {
      this.statusCode = status;
      Object.assign(this.headers, headers);
    },
    end(body = "") {
      this.body = String(body);
    }
  };
}

async function invoke({ method = "POST", url = "/api/run-growth-cycle", authorization } = {}) {
  const request = {
    method,
    url,
    headers: authorization ? { authorization } : {}
  };
  const response = responseRecorder();
  await handleRequest(request, response);
  return {
    status: response.statusCode,
    body: response.body ? JSON.parse(response.body) : undefined
  };
}

test("unauthorized growth request returns 401", async () => {
  const response = await invoke();
  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { ok: false, error: "unauthorized" });
});

test("authorized growth request skips safely when cooldown is active", async () => {
  const response = await invoke({ authorization: "Bearer test-secret" });
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(response.body.skipped, true);
  assert.equal(typeof response.body.nextCycleDueInSeconds, "number");
  assert.ok(response.body.nextCycleDueInSeconds > 0);
});

test("cooldown skip is preserved across repeated authorized requests", async () => {
  const first = await invoke({ authorization: "Bearer test-secret" });
  const second = await invoke({ authorization: "Bearer test-secret" });

  assert.equal(first.body.skipped, true);
  assert.equal(second.body.skipped, true);
  assert.ok(second.body.nextCycleDueInSeconds <= first.body.nextCycleDueInSeconds);
});
