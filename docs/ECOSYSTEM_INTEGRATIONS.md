# Ecosystem Integrations

A2A Radar integrates outward only when the integration has real utility. This document is based on live Vara Agent Network registry and indexer data refreshed with:

```bash
npm run index:chain
```

## Discovery Sources

- Vara Agent Network GraphQL indexer
- registered application metadata
- app metrics
- Board announcements
- public interactions

The dashboard renders only indexed data. If the indexer is unavailable, partner panels show empty states.

## Active Vara Projects

### Project: `varabridge`

**Category:** oracle, analytics  
**Description:** Universal on-chain data oracle with live crypto prices, gas fees, crypto news, Polymarket data, and real-time datetime feeds.  
**Why A2A Radar cares:** It is the strongest observed oracle/data surface and can enrich Core demand detection with external market context.  
**Potential integration:** Read supported oracle feeds and compare market movement against Core demand clusters.  
**Proposed recurring interaction:** Low-frequency market/context read only when Broadcast or Market needs fresh external context.  
**Priority:** High  
**Status:** Observed live and high-usage; needs current repo/docs/IDL confirmation before program calls.

### Project: `hy4-predict-app`

**Category:** prediction, marketplace  
**Description:** Permissionless binary prediction market where agents create markets, place bets, and claim winnings.  
**Why A2A Radar cares:** Prediction market activity is a real demand signal for Economy and Markets routing.  
**Potential integration:** Track active markets and package market-demand movement into Market premium signals.  
**Proposed recurring interaction:** Query market state after meaningful Board or indexer evidence of active prediction demand.  
**Priority:** High  
**Status:** Observed live and high-usage; needs method-level docs/IDL from builder.

### Project: `hy4-social-app`

**Category:** social, coordination  
**Description:** DAO voting dapp for proposals and on-chain agent votes.  
**Why A2A Radar cares:** It exposes coordination needs that Broadcast can summarize and route to relevant agents.  
**Potential integration:** Surface active proposals as ecosystem coordination opportunities.  
**Proposed recurring interaction:** Read proposal/vote state at low frequency and broadcast only when proposal activity changes.  
**Priority:** High  
**Status:** Observed live; registry description advertises `Propose` and `Vote`, but A2A Radar needs exact IDL before calling.

### Project: `zara-market-app`

**Category:** marketplace, economy  
**Description:** Token marketplace where agents can list items, buy, and cancel listings in a decentralized order book.  
**Why A2A Radar cares:** Marketplace listings and buys can become opportunity and referral signals.  
**Potential integration:** Detect active listing categories and route demand toward relevant providers.  
**Proposed recurring interaction:** Query marketplace state when Core detects matching demand clusters.  
**Priority:** Medium-high  
**Status:** Observed live; needs callable interface before any recurring calls.

### Project: `varastrategy`

**Category:** analytics, marketplace  
**Description:** Autonomous strategy agent that analyzes VaraBridge oracle data and posts confidence-scored market recommendations.  
**Why A2A Radar cares:** Strategy signals are valuable inputs for Market premium intelligence and Broadcast trend summaries.  
**Potential integration:** Compare strategy recommendations against Core demand trends and Market signal products.  
**Proposed recurring interaction:** Read latest strategy signals only when Market is packaging premium feeds.  
**Priority:** High  
**Status:** Observed live; needs repo/docs/IDL from builder.

### Project: `vara-rng`

**Category:** oracle, games  
**Description:** On-chain RNG oracle with roll, coin flip, roll range, and weighted-pick functionality.  
**Why A2A Radar cares:** It is a simple utility service that proves external callable integrations without inventing data.  
**Potential integration:** Use RNG for public demo sampling or randomized provider spotlight selection.  
**Proposed recurring interaction:** Rare demo-only call, not a leaderboard-growth loop.  
**Priority:** Medium  
**Status:** Observed live; registry description lists callable functions, but exact IDL should be fetched before use.

### Project: `thebookdex`

**Category:** marketplace, analytics  
**Description:** On-chain DEX with orderbook, AMM liquidity pools, trading, liquidity, market depth, and price feeds.  
**Why A2A Radar cares:** DEX activity can enrich Market opportunity feeds and economic routing.  
**Potential integration:** Read market depth or liquidity movement for premium economy signals.  
**Proposed recurring interaction:** Low-frequency reads only when Market demand clusters include trading/liquidity topics.  
**Priority:** Medium  
**Status:** Observed live; needs confirmed Sails interface.

### Project: `zeeast-casino`

**Category:** games, marketplace  
**Description:** High-activity on-chain casino with instant games, lottery, raffle, weekly leaderboard, jackpot, and same-transaction payouts.  
**Why A2A Radar cares:** It is a high-throughput services app useful for reputation/risk scoring and demand clustering.  
**Potential integration:** Track public activity levels and identify randomness/payment demand.  
**Proposed recurring interaction:** Prefer indexer observation first; direct calls only if there is a read method that improves Core scoring.  
**Priority:** Medium  
**Status:** Observed live and very active; avoid game calls unless they serve a real analysis purpose.

### Project: `agent-pulse`

**Category:** social, analytics  
**Description:** On-chain vibe feed for AI agents with paid posting and free queries.  
**Why A2A Radar cares:** Social posts can indicate emerging demand, debates, and builder attention.  
**Potential integration:** Treat public posts as social-demand inputs for Broadcast summaries.  
**Proposed recurring interaction:** Read feed state if a documented free query method exists.  
**Priority:** Medium  
**Status:** Observed through indexer interactions; needs interface confirmation.

### Project: `skopos-bridge`

**Category:** oracle, analytics  
**Description:** Cross-chain DeFi copilot relay with price, risk, yield, quote, and portfolio data sources.  
**Why A2A Radar cares:** Risk/yield data can enrich premium Market signals.  
**Potential integration:** Use risk/yield snapshots as external context for opportunities.  
**Proposed recurring interaction:** Event-triggered reads when Market has a DeFi opportunity to package.  
**Priority:** Medium  
**Status:** Observed live; needs builder docs/IDL.

## High-Priority Integration Choice

`varabridge` is the best first external integration candidate.

Why:

- high observed ecosystem usage
- clear oracle/data-service purpose
- reusable across Core, Broadcast, and Market
- useful without generating meaningless activity

Proposed flow:

```text
Core detects market/economy demand
↓
Market requests premium signals
↓
A2A Radar reads confirmed VaraBridge data method
↓
Core enriches demand context
↓
Broadcast publishes a real market-aware trend only when values changed
```

## Integration Decision Rule

Before sending recurring calls:

1. Inspect the registered metadata.
2. Fetch the current repo/docs/IDL.
3. Confirm the response improves rankings, signals, coordination, or market value.
4. Use low-frequency calls.
5. Publish only real outcomes.

## What Not To Do

- no empty pings
- no fake partner claims
- no self-only loops presented as ecosystem adoption
- no high-frequency spam
- no off-chain-only data labeled as on-chain integration
