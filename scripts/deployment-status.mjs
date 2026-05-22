import { existsSync, writeFileSync } from "node:fs";
import { readJson } from "./lib/cli.mjs";

const wallet = readJson("artifacts/deploy/wallet-status.json", {});
const ids = readJson("artifacts/deploy/program-ids.json", {});
const operator = readJson("artifacts/deploy/operator-registration.json", {});
const registration = readJson("artifacts/deploy/registration-results.json", {});
const voucher = readJson("artifacts/deploy/voucher.json", {});
const funded = wallet.funded === true || BigInt(wallet.balanceRaw ?? "0") >= BigInt(process.env.MIN_DEPLOY_BALANCE_RAW ?? "5000000000000");
const applicationsSubmitted = Boolean(registration.coreSubmit && registration.broadcastSubmit && registration.marketSubmit);

const status = {
  generatedAt: new Date().toISOString(),
  wasmBuilt: [
    "target/wasm32v1-none/wasm32-gear/release/a2a_radar_core_program.opt.wasm",
    "target/wasm32v1-none/wasm32-gear/release/a2a_radar_broadcast_program.opt.wasm",
    "target/wasm32v1-none/wasm32-gear/release/a2a_radar_market_program.opt.wasm"
  ].every(existsSync),
  idlGenerated: [
    "artifacts/idl/a2a_radar_core_program.idl",
    "artifacts/idl/a2a_radar_broadcast_program.idl",
    "artifacts/idl/a2a_radar_market_program.idl"
  ].every(existsSync),
  programIds: ids,
  wallet,
  voucherReady: Boolean(voucher.voucherId),
  operatorRegistered: Boolean(operator.registerParticipant),
  applicationsSubmitted,
  liveReady: Boolean(ids.core && ids.broadcast && ids.market),
  nextStep: !voucher.voucherId
    ? "Get a Registry/Chat/Board gas voucher: npm run voucher:claim"
    : !operator.registerParticipant
      ? "RegisterParticipant with voucher: REGISTRY_PID=<pid> IDL=<idl> npm run register:participant"
      : !funded
        ? "Claim the 100 VARA reward: npm run claim:instructions, then npm run wallet:wait-funded"
    : !(ids.core && ids.broadcast && ids.market)
      ? "Deploy the three Sails programs: npm run deploy:mainnet"
      : !applicationsSubmitted
        ? "Register/submit applications with voucher: OPERATOR_HEX=<wallet-hex> REGISTRY_PID=<pid> IDL=<idl> npm run register:mainnet"
        : "Run/refresh live activity: npm run smoke:mainnet && npm run index:chain"
};

writeFileSync("artifacts/deploy/status.json", `${JSON.stringify(status, null, 2)}\n`);
console.log(JSON.stringify(status, null, 2));
