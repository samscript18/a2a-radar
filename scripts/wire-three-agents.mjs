import { agents, requireEnv, requireProgramIds, runJson, varaWalletArgs, writeJson } from "./lib/cli.mjs";

const ids = requireProgramIds();
const boardPid = requireEnv("BOARD_PID");
const chatPid = requireEnv("CHAT_PID");

const results = {};

console.log("Configuring Core -> Broadcast + Market");
results.core = runJson("vara-wallet", varaWalletArgs([
  "call",
  ids.core,
  "Core/ConfigureAgents",
  "--args",
  JSON.stringify([ids.broadcast, ids.market]),
  "--idl",
  agents.core.idl
]));

console.log("Configuring Broadcast -> Core + Board + Chat");
results.broadcast = runJson("vara-wallet", varaWalletArgs([
  "call",
  ids.broadcast,
  "Broadcast/Configure",
  "--args",
  JSON.stringify([ids.core, boardPid, chatPid]),
  "--idl",
  agents.broadcast.idl
]));

console.log("Configuring Market -> Core");
results.market = runJson("vara-wallet", varaWalletArgs([
  "call",
  ids.market,
  "Market/Configure",
  "--args",
  JSON.stringify([ids.core]),
  "--idl",
  agents.market.idl
]));

writeJson("artifacts/deploy/wire-results.json", results);
