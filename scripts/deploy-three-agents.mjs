import { agents, ensureFile, extractProgramId, isFundedForDeploy, programIdsPath, readJson, run, runJson, varaWalletArgs, writeJson } from "./lib/cli.mjs";

const dryRun = process.argv.includes("--dry-run");
const skipFundingGate = process.env.SKIP_DEPLOY_BALANCE_CHECK === "1";
const forceDeploy = process.env.FORCE_DEPLOY === "1";

for (const agent of Object.values(agents)) {
  ensureFile(agent.wasm);
  ensureFile(agent.idl);
}

const walletList = runJson("vara-wallet", ["wallet", "list"]);
if (!dryRun && Array.isArray(walletList) && walletList.length === 0 && !process.env.SEED && !process.env.MNEMONIC) {
  throw new Error("No vara-wallet account found. Run `vara-wallet init` or import a funded/vouchered wallet first.");
}

if (!dryRun && !skipFundingGate) {
  const wallet = readJson("artifacts/deploy/wallet-status.json", {});
  if (!isFundedForDeploy(wallet)) {
    throw new Error([
      "Refusing to deploy before the operator wallet is funded.",
      "Official hackathon order is: RegisterParticipant with voucher -> claim 100 VARA -> deploy programs.",
      `Current balanceRaw=${wallet.balanceRaw ?? "unknown"}. Required MIN_DEPLOY_BALANCE_RAW=${process.env.MIN_DEPLOY_BALANCE_RAW ?? "5000000000000"}.`,
      "Run `npm run claim:instructions`, complete the site claim, then run `npm run wallet:status` before retrying."
    ].join("\n"));
  }
}

const programIds = readJson(programIdsPath());

for (const agent of Object.values(agents)) {
  if (!dryRun && programIds[agent.key] && !forceDeploy) {
    console.log(`Skipping ${agent.handle}; existing PROGRAM_ID=${programIds[agent.key]}`);
    continue;
  }

  const args = varaWalletArgs(["program", "upload", agent.wasm, "--idl", agent.idl, "--init", "New", "--args", "[]"]);
  if (dryRun) args.push("--dry-run");
  console.log(`${dryRun ? "Dry-run" : "Uploading"} ${agent.handle}`);
  const output = dryRun
    ? run("vara-wallet", args, { capture: true })
    : run("vara-wallet", args, { capture: true });

  if (!dryRun) {
    const programId = extractProgramId(output);
    if (!programId) {
      writeJson(`artifacts/deploy/${agent.key}-upload-output.json`, output);
      throw new Error(`Could not parse program id for ${agent.handle}. Raw output saved.`);
    }
    programIds[agent.key] = programId;
    console.log(`${agent.handle} -> ${programId}`);
  }
}

if (!dryRun) {
  writeJson(programIdsPath(), programIds);
}
