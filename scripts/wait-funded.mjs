import { runJson, varaWalletArgs, writeJson } from "./lib/cli.mjs";

const minimum = BigInt(process.env.MIN_CLAIM_BALANCE_RAW ?? "50000000000000");
const attempts = Number(process.env.FUNDING_WAIT_ATTEMPTS ?? "150");
const delayMs = Number(process.env.FUNDING_WAIT_DELAY_MS ?? "2000");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (let i = 1; i <= attempts; i += 1) {
  const balance = runJson("vara-wallet", varaWalletArgs(["balance"]));
  const raw = BigInt(balance.balanceRaw ?? "0");
  const status = {
    address: balance.address,
    addressSS58: balance.addressSS58,
    balance: balance.balance,
    balanceRaw: balance.balanceRaw,
    funded: raw >= BigInt(process.env.MIN_DEPLOY_BALANCE_RAW ?? "5000000000000"),
    claimFunded: raw >= minimum,
    generatedAt: new Date().toISOString()
  };
  writeJson("artifacts/deploy/wallet-status.json", status);

  if (raw >= minimum) {
    console.log(`OK: claim funding detected. balance=${balance.balance} balanceRaw=${balance.balanceRaw}`);
    process.exit(0);
  }

  console.log(`Waiting for 100 VARA claim funding (${i}/${attempts}). balance=${balance.balance} balanceRaw=${balance.balanceRaw}`);
  if (i < attempts) await sleep(delayMs);
}

throw new Error(`Funding did not reach ${minimum} raw units. Confirm the hackathon claim page succeeded, then rerun npm run wallet:wait-funded.`);
