import { runGrowthCycle } from "../apps/api/src/services/growth-cycle.ts";

const once = process.argv.includes("--once");
const force = process.argv.includes("--force") || process.env.FORCE_GROWTH_LOOP === "1";
const loopDelayMs = Number(process.env.GROWTH_DAEMON_DELAY_MS ?? process.env.GROWTH_LOOP_INTERVAL_MS ?? 15 * 60 * 1000);

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

do {
  const result = await runGrowthCycle({ force });
  console.log(JSON.stringify(result, null, 2));
  if (once) break;

  const delayMs = result.skipped
    ? Math.max(1_000, result.nextCycleDueInSeconds * 1_000)
    : loopDelayMs;
  console.log(`Sleeping ${Math.ceil(delayMs / 1000)}s before next growth cycle.`);
  await sleep(delayMs);
} while (true);
