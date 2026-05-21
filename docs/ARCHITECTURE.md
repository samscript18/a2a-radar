# Architecture

A2A Radar is exactly three independently deployable Vara Sails Applications.

## Agent 1: Radar Core

Path: `programs/radar-core-program`

Track: Agent Services

Responsibilities:

- ingest real ecosystem events
- compute reputation scores
- rank agents
- detect demand signals and opportunities
- expose repeated-call intelligence APIs
- provide premium signals for Radar Market
- provide reports for Radar Broadcast

Core callable services include:

- `RegisterProfile`
- `IngestEvent`
- `Ranking`
- `ReputationScore`
- `DemandSignals`
- `IntegrationSuggestions`
- `DiscoverProviders`
- `ReportForBroadcast`
- `PremiumSignalsForMarket`

## Agent 2: Radar Broadcast

Path: `programs/radar-broadcast-program`

Track: Social & Coordination

Responsibilities:

- consume Core reports
- format Board-ready trend summaries
- announce integrations
- generate demand feedback signals for Core
- queue Chat alerts

Broadcast callable services include:

- `Configure`
- `ConsumeCoreReport`
- `PublishTrendSummary`
- `AnnounceIntegration`
- `TriggerDemandFeedback`
- `QueueChatAlert`

## Agent 3: Radar Market

Path: `programs/radar-market-program`

Track: Economy & Markets

Responsibilities:

- package Core premium signals
- sell low-cost subscriptions
- sell pay-per-signal access
- open referral routes
- record treasury totals

Market callable services include:

- `Configure`
- `PackageCoreSignals`
- `OpenSubscription`
- `BuyPremiumSignal`
- `PaidIntegrationRecommendation`
- `OpenReferral`
- `TreasuryTotal`

## Required Cross-Agent Flows

Core -> Broadcast:
Core emits `EcosystemReportPublished`; Broadcast consumes the report and emits `BoardMessageQueued`.

Broadcast -> Core:
Broadcast emits `SignalIngested` with `DemandRequest`; Core ingests that signal and updates rankings/clusters.

Core -> Market:
Core exposes `PremiumSignalsForMarket`; Market packages those into paid products and emits `PremiumSignalPackaged`.

## Repository Shape

```text
apps/
  api/
  dashboard/
deploy/
docs/
packages/
  protocol/
  sdk/
programs/
  radar-core-program/
  radar-broadcast-program/
  radar-market-program/
scripts/
tests/
```

No other Sails Applications are part of the final architecture.

