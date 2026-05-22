import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

const expectedPrograms = [
  "radar-broadcast-program",
  "radar-core-program",
  "radar-market-program"
];

test("workspace exposes exactly three deployable Sails programs", () => {
  const programs = readdirSync("programs", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(programs, expectedPrograms);

  const cargo = readFileSync("Cargo.toml", "utf8");
  for (const program of expectedPrograms) {
    assert.match(cargo, new RegExp(`programs/${program}`));
  }
  assert.doesNotMatch(cargo, /signal-engine|reputation-oracle|hub-listener|subscriptions|treasury|marketplace"|leaderboard"|broadcaster"/);
});

test("mainnet registration manifest contains exactly three applications", () => {
  const manifest = JSON.parse(readFileSync("deploy/mainnet/programs.json", "utf8"));
  assert.deepEqual(Object.keys(manifest).sort(), ["radarBroadcast", "radarCore", "radarMarket"]);
  assert.equal(manifest.radarCore.handle, "a2a-radar-core");
  assert.equal(manifest.radarBroadcast.handle, "a2a-radar-broadcast");
  assert.equal(manifest.radarMarket.handle, "a2a-radar-market");
});

test("dashboard fallback is empty and not simulated", () => {
  const fallback = readFileSync("apps/dashboard/lib/demo-data.ts", "utf8");
  assert.match(fallback, /emptySnapshot/);
  assert.doesNotMatch(fallback, /@varabridge|@hy4|simulat/i);
});
