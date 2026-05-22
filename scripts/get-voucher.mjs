import { readJson, runJson, varaWalletArgs, writeJson } from "./lib/cli.mjs";
import { spawnSync } from "node:child_process";

let wallet = readJson("artifacts/deploy/wallet-status.json");
if (!wallet.address) {
  const balance = runJson("vara-wallet", varaWalletArgs(["balance"]));
  wallet = {
    address: balance.address,
    addressSS58: balance.addressSS58,
    balance: balance.balance,
    balanceRaw: balance.balanceRaw,
    funded: BigInt(balance.balanceRaw ?? "0") >= BigInt(process.env.MIN_DEPLOY_BALANCE_RAW ?? "5000000000000"),
    generatedAt: new Date().toISOString()
  };
  writeJson("artifacts/deploy/wallet-status.json", wallet);
}
const account = process.env.OPERATOR_HEX ?? wallet.address;
const pid = process.env.PID ?? process.env.REGISTRY_PID ?? "0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3";
const voucherUrl = process.env.VOUCHER_URL ?? "https://voucher-backend-agents.vara.network/voucher";
const lowVoucherBalance = BigInt(process.env.LOW_VOUCHER_BALANCE ?? "10000000000000");

if (!account || !account.startsWith("0x")) {
  throw new Error("Missing operator account hex. Set OPERATOR_HEX or refresh artifacts/deploy/wallet-status.json.");
}

function curlJson(args) {
  const result = spawnSync("curl", ["-sS", ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || `curl ${args.join(" ")} failed`);
  }
  const text = result.stdout.trim();
  if (!text) return { body: {}, status: 0 };
  const [bodyText, statusText] = text.includes("\n") ? [text.slice(0, text.lastIndexOf("\n")), text.slice(text.lastIndexOf("\n") + 1)] : [text, "200"];
  try {
    return { body: JSON.parse(bodyText), status: Number(statusText) || 200 };
  } catch {
    return { body: { raw: bodyText }, status: Number(statusText) || 200 };
  }
}

let { body: state } = curlJson([`${voucherUrl}/${account}`]);
let voucherId = state.voucherId;
const programs = Array.isArray(state.programs) ? state.programs : [];
const hasPid = programs.includes(pid);
const canTopUp = state.canTopUpNow === true;
const balanceKnown = state.balanceKnown === true;
const voucherBalance = BigInt(state.varaBalance ?? "0");
const needsTopUp = balanceKnown && voucherBalance < lowVoucherBalance;

if (!voucherId || !hasPid || (needsTopUp && canTopUp)) {
  const { body, status } = curlJson([
    "-w",
    "\\n%{http_code}",
    "-X",
    "POST",
    voucherUrl,
    "-H",
    "Content-Type: application/json",
    "-d",
    JSON.stringify({ account, programs: [pid] })
  ]);
  if (![200, 201, 429].includes(status)) {
    throw new Error(`Voucher request failed with HTTP ${status}: ${JSON.stringify(body)}`);
  }
  if (body.voucherId) voucherId = body.voucherId;
  state = { ...state, ...body, httpStatus: status };
}

if (!voucherId) {
  throw new Error(`No voucher available for ${account}`);
}

const result = {
  account,
  pid,
  voucherUrl,
  voucherId,
  state,
  generatedAt: new Date().toISOString()
};

writeJson("artifacts/deploy/voucher.json", result);
console.log(`VOUCHER_ID=${voucherId}`);
