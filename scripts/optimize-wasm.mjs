import { agents, ensureFile, run } from "./lib/cli.mjs";

for (const agent of Object.values(agents)) {
  ensureFile(agent.rawWasm ?? agent.wasm);
  console.log(`Optimizing ${agent.handle}`);
  run("node_modules/.bin/wasm-opt", [
    "-Oz",
    "--strip-debug",
    "--strip-producers",
    agent.rawWasm ?? agent.wasm,
    "-o",
    agent.wasm
  ]);
}
