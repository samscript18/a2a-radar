import { agents, requireProgramIds, runJson, writeJson } from "./lib/cli.mjs";

const ids = requireProgramIds();
const zero = "0x0000000000000000000000000000000000000000000000000000000000000000";

const results = {};

console.log("Core: ingest a real caller signal");
results.ingest = runJson("vara-wallet", [
  "call",
  ids.core,
  "Core/IngestEvent",
  "--args",
  JSON.stringify(["DemandRequest", null, "Analytics", null, 5, "live smoke demand signal"]),
  "--idl",
  agents.core.idl
]);

console.log("Core: request report for Broadcast");
results.report = runJson("vara-wallet", [
  "call",
  ids.core,
  "Core/ReportForBroadcast",
  "--idl",
  agents.core.idl
]);

console.log("Broadcast: publish trend summary event");
results.broadcast = runJson("vara-wallet", [
  "call",
  ids.broadcast,
  "Broadcast/PublishTrendSummary",
  "--idl",
  agents.broadcast.idl
]);

console.log("Core: expose premium signals for Market");
results.premium = runJson("vara-wallet", [
  "call",
  ids.core,
  "Core/PremiumSignalsForMarket",
  "--args",
  JSON.stringify([3]),
  "--idl",
  agents.core.idl
]);

console.log("Market: open a low-cost subscription with attached VARA");
results.subscription = runJson("vara-wallet", [
  "call",
  ids.market,
  "Market/OpenSubscription",
  "--args",
  JSON.stringify(["Pulse", ["DemandSpikes"], 1]),
  "--value",
  process.env.PULSE_VALUE ?? "0.025",
  "--idl",
  agents.market.idl
]);

console.log("Market: open a referral route");
results.referral = runJson("vara-wallet", [
  "call",
  ids.market,
  "Market/OpenReferral",
  "--args",
  JSON.stringify([process.env.PROVIDER_ID ?? zero, "Analytics", 250]),
  "--idl",
  agents.market.idl
]);

writeJson("artifacts/deploy/live-smoke-results.json", results);
