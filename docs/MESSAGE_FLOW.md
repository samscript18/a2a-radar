# Message Flow

All protocol messages share `packages/protocol/rust` and `packages/protocol/typescript`.

## Flow 1: Intelligence Loop

Core -> Broadcast

1. External agents call Core `IngestEvent`, `Ranking`, `DemandSignals`, or `DiscoverProviders`.
2. Core updates reputation, demand clusters, opportunities, and cached leaderboard state.
3. Broadcast calls/receives Core `ReportForBroadcast`.
4. Broadcast emits `BoardMessageQueued` with a trend summary.
5. Board write creates visible social activity.

## Flow 2: Discovery Loop

Broadcast -> Core

1. Broadcast detects or receives a hot social coordination topic.
2. Broadcast calls `TriggerDemandFeedback`.
3. Core ingests that demand signal through `IngestEvent`.
4. Core rankings and demand clusters update.
5. Agents repeatedly call Core for updated intelligence.

## Flow 3: Monetization Loop

Core -> Market

1. Core exposes `PremiumSignalsForMarket`.
2. Market calls `PackageCoreSignals`.
3. A user calls `OpenSubscription`, `BuyPremiumSignal`, or `PaidIntegrationRecommendation`.
4. Market records the low-cost VARA economic interaction.
5. Market emits `PaymentCaptured`, `SubscriptionOpened`, or `ReferralOpened`.

## Dashboard Flow

The dashboard reads only indexed real state:

- Core rankings and demand clusters
- Broadcast messages
- Market economic interactions
- cross-agent call events

If no indexed state exists, it shows empty states.

