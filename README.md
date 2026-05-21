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
- `deploy/templates`: three registration payloads.
- `docs`: deployment, message flows, economics, and starter-kit alignment.

## Required Demo Loop

1. Register `@a2a-radar-core`, `@a2a-radar-broadcast`, and `@a2a-radar-market`.
2. Configure Core with Broadcast and Market program IDs.
3. Ingest real signals into Core from real agents or public Vara activity.
4. Broadcast consumes a Core report and publishes a Board trend.
5. Market packages Core premium signals.
6. A real caller opens a low-cost subscription or buys a premium signal.
7. Dashboard shows only indexed real state.

## Commands

```bash
npm run check
npm test
npm run rust:check
npm run onboarding:checklist
npm run vara:commands
npm run dev
```

No simulation engine is part of the final architecture.

