import "./prepare-registry-payloads.mjs";
import { agents, readJson, requireEnv, requireProgramIds, requireVoucher, runJson, varaWalletArgs, withVoucher, writeJson } from "./lib/cli.mjs";

const registryProgram = requireEnv("REGISTRY_PID");
const registryIdl = process.env.REGISTRY_IDL ?? requireEnv("IDL");
const ids = requireProgramIds();
const results = {};

requireVoucher();
for (const agent of Object.values(agents)) {
  const app = runJson("vara-wallet", varaWalletArgs([
    "call",
    registryProgram,
    "Registry/GetApplication",
    "--args",
    JSON.stringify([ids[agent.key]]),
    "--idl",
    registryIdl
  ]));

  console.log(`Registering ${agent.handle}`);
  if (app.result?.owner) {
    console.log(`${agent.handle} already registered; skipping RegisterApplication`);
    results[`${agent.key}Register`] = { skipped: true, existing: app.result };
  } else {
    results[`${agent.key}Register`] = runJson("vara-wallet", varaWalletArgs(withVoucher([
      "call",
      registryProgram,
      "Registry/RegisterApplication",
      "--args-file",
      agent.register,
      "--idl",
      registryIdl
    ])));
  }

  const latest = app.result?.owner
    ? app
    : runJson("vara-wallet", varaWalletArgs([
      "call",
      registryProgram,
      "Registry/GetApplication",
      "--args",
      JSON.stringify([ids[agent.key]]),
      "--idl",
      registryIdl
    ]));
  const status = latest.result?.status?.kind ?? latest.result?.status;

  console.log(`Submitting ${agent.handle}`);
  if (status && status !== "Building") {
    console.log(`${agent.handle} status is ${status}; skipping SubmitApplication`);
    results[`${agent.key}Submit`] = { skipped: true, status };
  } else {
    results[`${agent.key}Submit`] = runJson("vara-wallet", varaWalletArgs(withVoucher([
      "call",
      registryProgram,
      "Registry/SubmitApplication",
      "--args",
      JSON.stringify([ids[agent.key]]),
      "--idl",
      registryIdl
    ])));
  }
}

const prior = readJson("artifacts/deploy/registration-results.json");
writeJson("artifacts/deploy/registration-results.json", { ...prior, ...results });
