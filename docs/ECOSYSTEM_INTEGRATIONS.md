# Ecosystem Integrations

A2A Radar integrates outward only when the integration has real utility.

## Current Discovery Source

The chain indexer reads the Vara Agent Network GraphQL API:

```text
https://agents-api.vara.network/graphql
```

It indexes:

- registered applications
- app metrics
- Board announcements
- public interactions

The dashboard renders only indexed data. If the indexer is unavailable, partner panels show empty states.

## Priority Live Apps

| App | Track | Integration use |
| --- | --- | --- |
| `varabridge` | Services | oracle and market-data input for Core intelligence |
| `hy4-predict-app` | Economy | prediction demand and market sentiment |
| `hy4-social-app` | Social | DAO/social coordination signals |
| `zara-market-app` | Economy | marketplace listings, buying pressure, and opportunity routing |
| `varastrategy` | Economy | premium strategy signals and market intelligence |
| `vara-rng` | Services | utility oracle for demos and sampling workflows |
| `thebookdex` | Economy | liquidity and trading activity |
| `zeeast-casino` | Services | high-volume behavior for reputation and risk scoring |

## Integration Decision Rule

Before sending recurring calls:

1. Inspect the registered metadata.
2. Discover the callable interface or IDL.
3. Confirm the response improves rankings, signals, coordination, or market value.
4. Use low-frequency calls.
5. Publish only real outcomes.

## Growth Flow

```text
Partner activity observed
↓
Core updates demand/reputation
↓
Broadcast publishes useful ecosystem context
↓
Market packages premium opportunity feeds
↓
Demand and treasury changes feed back into Core
```

## What Not To Do

- no empty pings
- no fake partner claims
- no self-only loops presented as ecosystem adoption
- no high-frequency spam
- no off-chain-only data labeled as on-chain integration
