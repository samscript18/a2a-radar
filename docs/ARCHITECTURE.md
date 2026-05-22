# Architecture

A2A Radar is a live 3-agent Vara protocol.

It is not a dashboard-only app. The dashboard is the window into three deployed Sails applications that call, update, and monetize one another.

## Canonical Agents

| Agent | Track | Program |
| --- | --- | --- |
| `a2a-radar-core-v2` | Agent Services | `0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503` |
| `a2a-radar-broadcast-v2` | Social & Coordination | `0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a` |
| `a2a-radar-market-v2` | Economy & Markets | `0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176` |

## Problem

Agent ecosystems need three things at once:

- discovery: which agents are useful right now?
- coordination: what should the ecosystem do next?
- monetization: which intelligence is valuable enough to pay for?

## Solution

```text
Core
↓
Broadcast
↓
Market
↓
Treasury
↓
Core
```

Core turns activity into intelligence. Broadcast turns intelligence into coordination. Market turns intelligence into paid products. Payments and demand reports flow back to Core.

## Agent Responsibilities

### Core

Path: `programs/radar-core-program`

Core is the intelligence engine.

Services:

- `Core/IngestEvent`
- `Core/Ranking`
- `Core/ReputationScore`
- `Core/DemandSignals`
- `Core/DiscoverProviders`
- `Core/IntegrationSuggestions`
- `Core/ReportForBroadcast`
- `Core/PremiumSignalsForMarket`

### Broadcast

Path: `programs/radar-broadcast-program`

Broadcast is the coordination surface.

Services:

- `Broadcast/ConsumeCoreReport`
- `Broadcast/PublishTrendSummary`
- `Broadcast/AnnounceIntegration`
- `Broadcast/TriggerDemandFeedback`
- `Broadcast/QueueChatAlert`

### Market

Path: `programs/radar-market-program`

Market is the economy layer.

Services:

- `Market/PackageCoreSignals`
- `Market/OpenSubscription`
- `Market/BuyPremiumSignal`
- `Market/PaidIntegrationRecommendation`
- `Market/OpenReferral`
- `Market/TreasuryTotal`

## Cross-Agent Call Flow

```text
Broadcast requests report
↓
Core returns ecosystem intelligence
↓
Broadcast publishes trend summary
↓
Market requests premium signals
↓
Core returns paid signal candidates
↓
Market opens paid recommendation/subscription
↓
Market reports purchase back to Core
↓
Core updates demand, opportunities, and rankings
```

## Deployment Structure

```text
programs/   # deployed Sails applications
apps/       # dashboard and secured growth API
packages/   # shared protocol schemas
scripts/    # deployment, smoke, growth, indexing
docs/       # operator, judge, and developer docs
```

## Result

A2A Radar creates repeatable Vara scoring signals:

- incoming Core calls
- outgoing cross-agent calls
- Board activity
- subscriptions
- treasury movement
- dashboard evidence

