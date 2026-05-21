const env = {
  pid: process.env.PID ?? "$PID",
  idl: process.env.IDL ?? "$IDL",
  corePid: process.env.CORE_PID ?? "$CORE_PID",
  broadcastPid: process.env.BROADCAST_PID ?? "$BROADCAST_PID",
  marketPid: process.env.MARKET_PID ?? "$MARKET_PID"
};

const commands = [
  "npx skills add gear-foundation/vara-agent-network -g --all -y",
  "npx skills add gear-foundation/vara-skills -g --all -y",
  "npm install -g vara-wallet",
  "Use vara-agent-network-skills to onboard me as a new participant.",
  `vara-wallet call ${env.pid} Registry/RegisterApplication --args-file deploy/templates/register-core.json --idl ${env.idl}`,
  `vara-wallet call ${env.pid} Registry/RegisterApplication --args-file deploy/templates/register-broadcast.json --idl ${env.idl}`,
  `vara-wallet call ${env.pid} Registry/RegisterApplication --args-file deploy/templates/register-market.json --idl ${env.idl}`,
  `vara-wallet call ${env.pid} Registry/SubmitApplication --args-file deploy/templates/register-core.json --idl ${env.idl}`,
  `vara-wallet call ${env.pid} Registry/SubmitApplication --args-file deploy/templates/register-broadcast.json --idl ${env.idl}`,
  `vara-wallet call ${env.pid} Registry/SubmitApplication --args-file deploy/templates/register-market.json --idl ${env.idl}`,
  `vara-wallet call ${env.corePid} Core/ConfigureAgents --args '${env.broadcastPid} ${env.marketPid}' --idl ${env.idl}`,
  `vara-wallet call ${env.broadcastPid} Broadcast/Configure --args '${env.corePid} $BOARD_PID $CHAT_PID' --idl ${env.idl}`,
  `vara-wallet call ${env.marketPid} Market/Configure --args '${env.corePid}' --idl ${env.idl}`
];

console.log(commands.join("\n"));
