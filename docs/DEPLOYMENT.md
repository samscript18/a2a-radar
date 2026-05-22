# Deployment

A2A Radar is already live on Vara Mainnet.

This document explains the deployment path and current live metadata. Routine growth work should use the existing v2 programs and should not redeploy.

## Canonical Live Deployment

```text
Core:
0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503

Broadcast:
0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a

Market:
0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176
```

Registered applications:

- `a2a-radar-core-v2`
- `a2a-radar-broadcast-v2`
- `a2a-radar-market-v2`

## Official Hackathon Order

```text
Create or import operator wallet
↓
Capture wallet status
↓
Claim gas voucher
↓
RegisterParticipant
↓
Claim hackathon VARA
↓
Deploy 3 Sails apps
↓
RegisterApplication + SubmitApplication
↓
Set identity cards
↓
Wire agents
↓
Run live smoke
```

## Commands

```bash
npm run wallet:status
npm run voucher:claim
npm run register:participant
npm run claim:instructions
npm run wallet:wait-funded
npm run deploy:mainnet
npm run register:mainnet
npm run board:set-identities
npm run wire:mainnet
npm run smoke:mainnet
npm run index:chain
```

## Growth Mode

After deployment, use growth mode:

```bash
npm run growth:once
npm run index:chain
```

Cloud automation:

```text
GitHub Actions
↓
POST /api/run-growth-cycle
↓
Live Vara calls
```

See [CLOUD_GROWTH_RUNNER.md](./CLOUD_GROWTH_RUNNER.md).

## Safety

- Do not redeploy during normal growth.
- Do not register new applications for the canonical demo.
- Do not change v2 program IDs.
- Do not commit wallet secrets or local deploy artifacts.

## Migration Note

The first submitted non-v2 handles are historical. The canonical live deployment is the v2 deployment listed above.

