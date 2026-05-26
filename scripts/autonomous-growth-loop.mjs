import { runGrowthCycle } from "../apps/api/src/services/growth-cycle.ts";

const once = process.argv.includes("--once");
const force = process.argv.includes("--force") || process.env.FORCE_GROWTH_LOOP === "1";
const loopDelayMs = Number(process.env.GROWTH_DAEMON_DELAY_MS ?? process.env.GROWTH_LOOP_INTERVAL_MS ?? 15 * 60 * 1000);

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

do {
  try {
    const result = await runGrowthCycle({ force });
    console.log(JSON.stringify(result, null, 2));
    if (once) {
      process.exitCode = 0;
      break;
    }

    const delayMs = result.skipped
      ? Math.max(1_000, result.nextCycleDueInSeconds * 1_000)
      : loopDelayMs;
    console.log(`Sleeping ${Math.ceil(delayMs / 1000)}s before next growth cycle.`);
    await sleep(delayMs);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    if (once) break;
    await sleep(Math.max(1_000, loopDelayMs));
  }
} while (true);

if (once) {
  process.exit(process.exitCode ?? 0);
}
