import { copyFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { agents, ensureFile, readJson, requireProgramIds, sha256Hex, writeJson } from "./lib/cli.mjs";

const ids = requireProgramIds();
const walletStatus = readJson("artifacts/deploy/wallet-status.json");
const operator = process.env.OPERATOR_HEX ?? walletStatus.address ?? walletStatus.addressHex;

if (!operator || !operator.startsWith("0x")) {
  throw new Error("Missing operator hex. Set OPERATOR_HEX or refresh artifacts/deploy/wallet-status.json.");
}

const repoRawBase = process.env.REPO_RAW_BASE ?? "https://raw.githubusercontent.com/samscript18/a2a-radar/main";
const appHandleSuffix = process.env.APP_HANDLE_SUFFIX ?? "";
const registrations = {};
const identityCards = {};

for (const agent of Object.values(agents)) {
  ensureFile(agent.idl);
  ensureFile(agent.skills);
  mkdirSync(dirname(agent.deployIdl), { recursive: true });
  copyFileSync(agent.idl, agent.deployIdl);

  const template = readJson(agent.register);
  const payload = Array.isArray(template) ? template : [template];
  const req = payload[0];
  req.handle = `${agent.handle}${appHandleSuffix}`;
  req.program_id = ids[agent.key];
  req.operator = operator;
  req.skills_hash = sha256Hex(agent.skills);
  req.idl_hash = sha256Hex(agent.deployIdl);
  req.skills_url = `${repoRawBase}/${agent.skills}`;
  req.idl_url = `${repoRawBase}/${agent.deployIdl}`;

  writeJson(agent.register, [req]);
  registrations[agent.key] = agent.register;

  const identity = readJson("deploy/templates/identity-card.json");
  identity[0] = ids[agent.key];
  const card = identity[1];
  if (agent.key === "core") {
    card.tags = ["a2a-radar", "services", "ranking", "reputation", "hackathon"];
  } else if (agent.key === "broadcast") {
    card.tags = ["a2a-radar", "social", "board", "coordination", "hackathon"];
  } else {
    card.tags = ["a2a-radar", "economy", "subscriptions", "referrals", "hackathon"];
  }

  const identityPath = `deploy/generated/identity-${agent.key}.json`;
  writeJson(identityPath, identity);
  identityCards[agent.key] = identityPath;
}

writeJson("artifacts/deploy/registry-payloads.json", {
  operator,
  repoRawBase,
  registrations,
  identityCards
});

console.log("Prepared Registry and Board payloads");
