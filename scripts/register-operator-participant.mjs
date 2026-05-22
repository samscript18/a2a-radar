import { ensureFile, readJson, requireEnv, requireVoucher, runJson, varaWalletArgs, withVoucher, writeJson } from "./lib/cli.mjs";

const registryProgram = requireEnv("REGISTRY_PID");
const registryIdl = process.env.REGISTRY_IDL ?? requireEnv("IDL");
const participantArgs = process.env.PARTICIPANT_ARGS ?? "deploy/templates/operator-participant.json";
const participantMethod = process.env.PARTICIPANT_METHOD ?? "Registry/RegisterParticipant";
const results = {};

requireVoucher();
ensureFile(participantArgs);
const participant = readJson(participantArgs);
const args = JSON.stringify([participant.handle, participant.github_url]);
const wallet = readJson("artifacts/deploy/wallet-status.json", {});
const operatorHex = process.env.OPERATOR_HEX ?? wallet.address;

if (!operatorHex) {
  throw new Error("Missing operator hex. Run npm run wallet:status first.");
}

console.log(`Checking operator participant ${participant.handle}`);
const existing = runJson("vara-wallet", varaWalletArgs([
  "call",
  registryProgram,
  "Registry/GetParticipant",
  "--args",
  JSON.stringify([operatorHex]),
  "--idl",
  registryIdl
]));

if (existing.result?.handle) {
  console.log(`Already registered as ${existing.result.handle}; skipping RegisterParticipant`);
  results.registerParticipant = { skipped: true, existing: existing.result };
} else {
  console.log(`Registering operator participant ${participant.handle}`);
  results.registerParticipant = runJson("vara-wallet", varaWalletArgs(withVoucher([
    "call",
    registryProgram,
    participantMethod,
    "--args",
    args,
    "--idl",
    registryIdl
  ])));
}

writeJson("artifacts/deploy/operator-registration.json", results);

console.log(`
Operator participant step is complete.

Next official hackathon step:
1. Run: npm run claim:instructions
2. Claim the 100 VARA X reward using the registered operator wallet.
3. Run: npm run wallet:status
4. Deploy only after funded=true: npm run deploy:mainnet
`);
