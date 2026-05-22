# A2A Radar

A2A Radar is a production-oriented 3-agent Vara autonomous economy protocol.

It deliberately deploys only three Sails Applications:

- `a2a-radar-core`: Agent Services intelligence engine.
- `a2a-radar-broadcast`: Social & Coordination broadcaster.
- `a2a-radar-market`: Economy & Markets monetization agent.

## Why This Shape

The system is optimized for hackathon scoring signals that matter on Vara: real inbound calls, real outbound/cross-agent calls, visible Board/Chat coordination, and at least one low-cost VARA economic loop.

## Monorepo

- `programs/radar-core-program`: rankings, reputation, demand signals, provider discovery, premium signal source.
- `programs/radar-broadcast-program`: consumes Core reports, emits Board/Chat-ready events, sends demand feedback to Core.
- `programs/radar-market-program`: subscriptions, premium signal purchase, referrals, treasury accounting.
- `apps/dashboard`: minimal read surface for real indexed/on-chain state.
- `apps/api`: snapshot API for the dashboard.
- `packages/protocol`: shared Rust and TypeScript schemas.
- `packages/sdk`: small read-model helpers.
- `deploy/templates`: operator participant identity plus three application registration payloads.
- `docs`: deployment, message flows, economics, and starter-kit alignment.

## Required Demo Loop

1. Create/use the operator wallet and write `artifacts/deploy/wallet-status.json`.
2. Get a gas voucher for Registry, Chat, and Board writes.
3. Register the operator participant handle `a2a-radar` with the voucher. This does not require wallet VARA.
4. Claim the hackathon 100 VARA X reward using the registered operator wallet address.
5. Deploy and register `a2a-radar-core`, `a2a-radar-broadcast`, and `a2a-radar-market` as Applications after the wallet is funded.
6. Configure Core with Broadcast and Market program IDs.
7. Ingest real signals into Core from real agents or public Vara activity.
8. Broadcast consumes a Core report and publishes a Board trend.
9. Market packages Core premium signals.
10. A real caller opens a low-cost subscription or buys a premium signal.
11. Dashboard shows only indexed real state.

## Commands

```bash
npm run check
npm test
npm run rust:check
npm run build:wasm
npm run idl:generate
npm run wallet:status
npm run voucher:claim
npm run register:participant
npm run claim:instructions
npm run wallet:wait-funded
npm run deploy:dry-run
npm run deploy:mainnet
npm run register:mainnet
npm run wire:mainnet
npm run smoke:mainnet
npm run index:chain
npm run onboarding:checklist
npm run vara:commands
npm run dev
```

No simulation engine is part of the final architecture.

## Live Deployment State

Operator participant:

```text
handle: a2a-radar
address: kGgiw74wBrrgS11CuZ2p8KfnbWYTRRtvCb89jMtaYEwDVQZhU
RegisterParticipant tx: 0xb741360fd952b605e9d5f1bcd465b2eea02a4663f717da540e6bfc4a19ec8d69
block: 33146065
```

Program IDs are written after upload to:

```text
artifacts/deploy/program-ids.json
```

Current corrected live program IDs:

```text
core:      0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503
broadcast: 0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a
market:    0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176
```

The first submitted application handles consumed `a2a-radar-core`,
`a2a-radar-broadcast`, and `a2a-radar-market`. The corrected deployment was
registered with `APP_HANDLE_SUFFIX=-v2`, producing `a2a-radar-core-v2`,
`a2a-radar-broadcast-v2`, and `a2a-radar-market-v2`.

Required environment variables for mainnet registration/wiring:

```bash
REGISTRY_PID=<vara registry program>
IDL=<registry idl path>
BOARD_PID=<board program>
CHAT_PID=<chat program>
```

Run `npm run register:participant` before deployment and application registration. This matches the hackathon starter flow: operator participant first for the wallet persona and voucher path, then claim deploy funds, then deploy Sails dapps for callable integrations.

`npm run deploy:mainnet` refuses to upload while the wallet balance is below `MIN_DEPLOY_BALANCE_RAW` so the scripts never assume deployment can happen before the 100 VARA claim.

The dashboard reads `artifacts/latest-snapshot.json`, which must be produced from real chain events via `npm run index:chain`.
