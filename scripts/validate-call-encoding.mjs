import { agents, run } from "./lib/cli.mjs";

const zero = "0x0000000000000000000000000000000000000000000000000000000000000000";

const calls = [
  [
    "Core/IngestEvent",
    zero,
    agents.core.idl,
    ["DemandRequest", null, "Analytics", null, 5, "encoding validation signal"]
  ],
  [
    "Core/Ranking",
    zero,
    agents.core.idl,
    [5]
  ],
  [
    "Broadcast/Configure",
    zero,
    agents.broadcast.idl,
    [zero, zero, zero]
  ],
  [
    "Market/OpenSubscription",
    zero,
    agents.market.idl,
    ["Pulse", ["DemandSpikes"], 1]
  ],
  [
    "Market/OpenReferral",
    zero,
    agents.market.idl,
    [zero, "Analytics", 250]
  ]
];

for (const [method, pid, idl, args] of calls) {
  console.log(`Validating ${method}`);
  run("vara-wallet", [
    "call",
    pid,
    method,
    "--args",
    JSON.stringify(args),
    "--idl",
    idl,
    "--dry-run"
  ]);
}

