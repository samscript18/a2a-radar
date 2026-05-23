import { agents, requireProgramIds } from "./lib/cli.mjs";
import { runTheBookDexIntegration } from "./lib/thebookdex-integration.mjs";

const ids = requireProgramIds();
const result = runTheBookDexIntegration({ ids, agents });

console.log(JSON.stringify({
  ok: true,
  partner: result.partner.handle,
  summary: result.summary,
  receiptsPath: "artifacts/deploy/thebookdex-integration-receipts.json"
}, null, 2));
