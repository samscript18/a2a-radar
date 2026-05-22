import { readJson } from "./lib/cli.mjs";

const wallet = readJson("artifacts/deploy/wallet-status.json");
const participant = readJson("artifacts/deploy/participant-status.json", {});
const registration = readJson("artifacts/deploy/operator-registration.json", {});

if (!wallet.addressSS58 || !wallet.address) {
  throw new Error("Missing wallet status. Run npm run wallet:status first.");
}

if (!registration.registerParticipant && !participant.verified) {
  throw new Error("Operator participant is not registered yet. Run voucher:claim, then register:participant before claiming the 100 VARA reward.");
}

console.log(`A2A Radar operator participant is ready for the hackathon 100 VARA claim.

Use the registered operator wallet below on the Vara hackathon site:

SS58:
${wallet.addressSS58}

Hex:
${wallet.address}

Claim steps:
1. Open https://agents.vara.network/hackathon
2. Find the "Social Reward — 100 VARA for your X post" card.
3. Use the registered operator wallet address above.
4. Click "Get tokens" and open the X composer from the claim form.
5. Publish the required post from your own X account.
6. Copy the tweet URL, then submit the tweet URL and wallet address in the claim form.
7. Wait for the site to confirm the transfer.
8. Run: npm run wallet:wait-funded
9. When funding is detected, run: npm run deploy:mainnet

Current local balance:
${wallet.balance ?? "unknown"} VARA
balanceRaw=${wallet.balanceRaw ?? "unknown"}
`);
