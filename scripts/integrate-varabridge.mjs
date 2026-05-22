import { agents, requireProgramIds } from "./lib/cli.mjs";
import { runVaraBridgeIntegration } from "./lib/varabridge-integration.mjs";

const ids = requireProgramIds();
const result = runVaraBridgeIntegration({ ids, agents });

console.log(JSON.stringify({
  ok: true,
  partner: result.partner.handle,
  summary: result.summary,
  receiptsPath: "artifacts/deploy/varabridge-integration-receipts.json"
}, null, 2));
