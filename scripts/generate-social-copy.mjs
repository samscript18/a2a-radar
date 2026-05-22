import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const snapshotPath = resolve("artifacts/latest-snapshot.json");
const receiptsPath = resolve("artifacts/deploy/growth-loop-receipts.json");
const outputPath = resolve("artifacts/social-proof-copy.md");

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function formatVara(raw) {
  const value = BigInt(String(raw ?? "0"));
  const whole = value / 1_000_000_000_000n;
  const fraction = (value % 1_000_000_000_000n).toString().padStart(12, "0").slice(0, 4);
  return `${whole}.${fraction} VARA`;
}

const snapshot = readJson(snapshotPath, {});
const receipts = readJson(receiptsPath, []);
const latestReceipt = receipts.at(-1) ?? {};
const treasuryRaw = snapshot.raw?.marketTreasuryRaw ?? "0";
const boardId = latestReceipt.boardAnnouncementId ?? snapshot.boardEvents?.[0]?.postId ?? "not indexed";
const topAgent = snapshot.leaderboard?.[0]?.handle ?? "not indexed";
const topCluster = snapshot.clusters?.[0]?.label ?? "not indexed";

const copy = `# A2A Radar Social Copy

Generated from local indexed artifacts. Replace any "not indexed" line only after refreshing with \`npm run index:chain\`.

## Launch Post

A2A Radar is live on Vara Mainnet.

3 agents:
- Core: intelligence and rankings
- Broadcast: Board coordination
- Market: subscriptions and premium signals

Live treasury: ${formatVara(treasuryRaw)}
Latest Board post: ${boardId}

@VaraNetwork #VaraNetwork #VaraAgents #VaraHackathon

## Milestone Post

A2A Radar growth cycle update:
- Signals indexed: ${snapshot.counts?.signals ?? "not indexed"}
- Subscriptions: ${snapshot.counts?.subscriptions ?? "not indexed"}
- Outgoing integrations: ${snapshot.counts?.outgoingIntegrations ?? "not indexed"}
- Economic interactions: ${snapshot.economicInteractions?.length ?? "not indexed"}

The protocol is optimizing for real recurring agent usage, not synthetic traffic.

@VaraNetwork #VaraAgents #VaraHackathon

## Integration Post

A2A Radar is tracking live Vara partner candidates:
${(snapshot.partners ?? []).slice(0, 5).map((partner) => `- @${partner.handle}: ${partner.integrationNote}`).join("\n") || "- not indexed"}

Next step: only integrate where the partner interface creates useful data, coordination, or demand routing.

@VaraNetwork #VaraAgents #VaraHackathon

## Treasury Update

A2A Radar Market has live micropayment activity.

Treasury: ${formatVara(treasuryRaw)}
Latest paid interaction: ${snapshot.economicInteractions?.at?.(-1)?.purpose ?? "not indexed"}

Micro-payments validate the Economy and Markets track while keeping access affordable.

@VaraNetwork #VaraAgents #VaraHackathon

## Leaderboard Movement

A2A Radar Core leaderboard snapshot:
- Top indexed agent: ${topAgent}
- Top demand cluster: ${topCluster}
- Latest Board announcement: ${boardId}

Core produces intelligence, Broadcast turns it into coordination, and Market monetizes premium signals.

@VaraNetwork #VaraAgents #VaraHackathon
`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, copy);
console.log(`Wrote ${outputPath}`);
