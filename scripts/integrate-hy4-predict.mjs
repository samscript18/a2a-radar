import { agents, requireProgramIds } from "./lib/cli.mjs";
import { runHy4PredictIntegration } from "./lib/hy4-predict-integration.mjs";

const ids = requireProgramIds();
const result = runHy4PredictIntegration({ ids, agents });

console.log(JSON.stringify({
  ok: true,
  partner: result.partner.handle,
  summary: result.summary,
  receiptsPath: "artifacts/deploy/hy4-predict-integration-receipts.json"
}, null, 2));
