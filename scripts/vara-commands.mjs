const env = {
  pid: process.env.PID ?? "0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3",
  idl: process.env.IDL ?? "$VARA_AGENT_NETWORK_SKILLS_DIR/idl/agents_network_client.idl",
  coreIdl: process.env.CORE_IDL ?? "artifacts/idl/a2a_radar_core_program.idl",
  broadcastIdl: process.env.BROADCAST_IDL ?? "artifacts/idl/a2a_radar_broadcast_program.idl",
  marketIdl: process.env.MARKET_IDL ?? "artifacts/idl/a2a_radar_market_program.idl",
  corePid: process.env.CORE_PID ?? "$CORE_PID",
  broadcastPid: process.env.BROADCAST_PID ?? "$BROADCAST_PID",
  marketPid: process.env.MARKET_PID ?? "$MARKET_PID",
  voucher: process.env.VOUCHER_ID ? ` --voucher ${process.env.VOUCHER_ID}` : " --voucher $VOUCHER_ID"
};

const commands = [
  "npx skills add gear-foundation/vara-agent-network -g --all -y",
  "npx skills add gear-foundation/vara-skills -g --all -y",
  "npm install -g vara-wallet",
  "Use vara-agent-network-skills to onboard me as a new participant.",
  `vara-wallet call ${env.pid} Registry/RegisterParticipant --args '["a2a-radar","https://github.com/samscript18/a2a-radar"]'${env.voucher} --idl ${env.idl}`,
  "npm run registry:prepare",
  `vara-wallet call ${env.pid} Registry/RegisterApplication --args-file deploy/templates/register-core.json${env.voucher} --idl ${env.idl}`,
  `vara-wallet call ${env.pid} Registry/RegisterApplication --args-file deploy/templates/register-broadcast.json${env.voucher} --idl ${env.idl}`,
  `vara-wallet call ${env.pid} Registry/RegisterApplication --args-file deploy/templates/register-market.json${env.voucher} --idl ${env.idl}`,
  `vara-wallet call ${env.pid} Registry/SubmitApplication --args '["${env.corePid}"]'${env.voucher} --idl ${env.idl}`,
  `vara-wallet call ${env.pid} Registry/SubmitApplication --args '["${env.broadcastPid}"]'${env.voucher} --idl ${env.idl}`,
  `vara-wallet call ${env.pid} Registry/SubmitApplication --args '["${env.marketPid}"]'${env.voucher} --idl ${env.idl}`,
  `vara-wallet call ${env.pid} Board/SetIdentityCard --args-file deploy/generated/identity-core.json${env.voucher} --idl ${env.idl}`,
  `vara-wallet call ${env.corePid} Core/ConfigureAgents --args '["${env.broadcastPid}","${env.marketPid}"]' --idl ${env.coreIdl}`,
  `vara-wallet call ${env.broadcastPid} Broadcast/Configure --args '["${env.corePid}","$BOARD_PID","$CHAT_PID"]' --idl ${env.broadcastIdl}`,
  `vara-wallet call ${env.marketPid} Market/Configure --args '["${env.corePid}"]' --idl ${env.marketIdl}`
];

console.log(commands.join("\n"));
