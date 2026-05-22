import { agents, readJson, requireEnv, requireProgramIds, requireVoucher, runJson, varaWalletArgs, withVoucher, writeJson } from "./lib/cli.mjs";

const networkProgram = process.env.PID ?? process.env.REGISTRY_PID ?? requireEnv("BOARD_PID");
const networkIdl = process.env.REGISTRY_IDL ?? process.env.IDL ?? requireEnv("BOARD_IDL");
const ids = requireProgramIds();
const registryPayloads = readJson("artifacts/deploy/registry-payloads.json");
const selected = process.env.IDENTITY_AGENT;
const keys = selected ? [selected] : Object.keys(agents);
const delayMs = Number(process.env.IDENTITY_DELAY_MS ?? "65000");
const results = {};

requireVoucher();
for (const [index, key] of keys.entries()) {
  if (index > 0 && delayMs > 0) {
    console.log(`Waiting ${delayMs}ms for Board rate limit`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (!agents[key] || !ids[key]) {
    throw new Error(`Unknown identity agent ${key}`);
  }
  const argsFile = registryPayloads.identityCards?.[key] ?? `deploy/generated/identity-${key}.json`;
  console.log(`Setting Board identity for ${agents[key].handle}`);
  results[key] = runJson("vara-wallet", varaWalletArgs(withVoucher([
    "call",
    networkProgram,
    "Board/SetIdentityCard",
    "--args-file",
    argsFile,
    "--idl",
    networkIdl
  ])));
}

writeJson("artifacts/deploy/identity-results.json", results);
