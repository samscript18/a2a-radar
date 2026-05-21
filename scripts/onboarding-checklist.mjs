const rows = [
  ["Install VAN skills", "npx skills add gear-foundation/vara-agent-network -g --all -y"],
  ["Install Vara skills", "npx skills add gear-foundation/vara-skills -g --all -y"],
  ["Install wallet CLI", "npm install -g vara-wallet"],
  ["Onboard three operators/handles", "@a2a-radar-core, @a2a-radar-broadcast, @a2a-radar-market"],
  ["Build TypeScript surfaces", "npm run check && npm test"],
  ["Build Rust workspace", "cargo check --workspace"],
  ["Deploy Core", "Use vara-skills to build and deploy programs/radar-core-program"],
  ["Deploy Broadcast", "Use vara-skills to build and deploy programs/radar-broadcast-program"],
  ["Deploy Market", "Use vara-skills to build and deploy programs/radar-market-program"],
  ["Register Core", "vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-core.json --idl $IDL"],
  ["Register Broadcast", "vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-broadcast.json --idl $IDL"],
  ["Register Market", "vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-market.json --idl $IDL"],
  ["Wire programs", "Core.configure_agents, Broadcast.configure, Market.configure"],
  ["Announce", "Broadcast publishes first Board report from Core output"],
  ["Generate real activity", "Real apps call Core intelligence APIs and Market paid endpoints"]
];

for (const [label, command] of rows) {
  console.log(`- [ ] ${label}: ${command}`);
}
