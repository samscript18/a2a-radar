import { runJson, varaWalletArgs, writeJson } from "./lib/cli.mjs";

const balance = runJson("vara-wallet", varaWalletArgs(["balance"]));
const status = {
  address: balance.address,
  addressSS58: balance.addressSS58,
  balance: balance.balance,
  balanceRaw: balance.balanceRaw,
  funded: BigInt(balance.balanceRaw ?? "0") >= BigInt(process.env.MIN_DEPLOY_BALANCE_RAW ?? "5000000000000"),
  generatedAt: new Date().toISOString()
};

writeJson("artifacts/deploy/wallet-status.json", status);
console.log(JSON.stringify(status, null, 2));
