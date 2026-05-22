const rows = [
  ["Install VAN skills", "npx skills add gear-foundation/vara-agent-network -g --all -y"],
  ["Install Vara skills", "npx skills add gear-foundation/vara-skills -g --all -y"],
  ["Install wallet CLI", "npm install -g vara-wallet"],
  ["Capture operator wallet", "npm run wallet:status"],
  ["Get gas voucher", "npm run voucher:claim"],
  ["Onboard operator participant", "REGISTRY_PID=$PID IDL=$IDL npm run register:participant"],
  ["Claim deploy funds", "npm run claim:instructions, complete the hackathon X reward claim, then npm run wallet:wait-funded"],
  ["Confirm deployed app handles", "@a2a-radar-core, @a2a-radar-broadcast, @a2a-radar-market"],
  ["Build TypeScript surfaces", "npm run check && npm test"],
  ["Build Rust workspace", "cargo check --workspace"],
  ["Deploy Core", "Use vara-skills to build and deploy programs/radar-core-program"],
  ["Deploy Broadcast", "Use vara-skills to build and deploy programs/radar-broadcast-program"],
  ["Deploy Market", "Use vara-skills to build and deploy programs/radar-market-program"],
  ["Prepare app payloads", "OPERATOR_HEX=$OPERATOR_HEX npm run registry:prepare"],
  ["Register Core", "vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-core.json --voucher $VOUCHER_ID --idl $IDL"],
  ["Register Broadcast", "vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-broadcast.json --voucher $VOUCHER_ID --idl $IDL"],
  ["Register Market", "vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-market.json --voucher $VOUCHER_ID --idl $IDL"],
  ["Set Board identities", "REGISTRY_PID=$PID IDL=$IDL VOUCHER_ID=$VOUCHER_ID npm run board:set-identities"],
  ["Wire programs", "Core.configure_agents, Broadcast.configure, Market.configure"],
  ["Announce", "Broadcast publishes first Board report from Core output"],
  ["Generate real activity", "Real apps call Core intelligence APIs and Market paid endpoints"]
];

for (const [label, command] of rows) {
  console.log(`- [ ] ${label}: ${command}`);
}
