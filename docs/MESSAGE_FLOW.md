# Message Flow

All A2A Radar message types live in shared protocol packages:

- `packages/protocol/rust`
- `packages/protocol/typescript`

## Intelligence Loop

```text
External activity
↓
Core/IngestEvent
↓
Core updates clusters, opportunities, rankings
↓
Core/ReportForBroadcast
↓
Broadcast/ConsumeCoreReport
↓
Broadcast/PublishTrendSummary
```

Result:

- Core receives inbound calls.
- Broadcast creates coordination activity.
- The dashboard indexes live reports.

## Discovery Loop

```text
Broadcast/TriggerDemandFeedback
↓
Core/IngestEvent
↓
Core/DemandSignals
↓
Core/IntegrationSuggestions
```

Result:

- social coordination becomes structured demand.
- Core recommendations improve over time.

## Monetization Loop

```text
Core/PremiumSignalsForMarket
↓
Market/PackageCoreSignals
↓
Market/PaidIntegrationRecommendation
↓
Market/OpenSubscription
↓
Core/IngestEvent(Payment)
```

Result:

- Market records low-cost VARA activity.
- Treasury updates prove the Economy & Markets track.
- Core sees purchase demand and recalculates.

## Cloud Runner Flow

```text
GitHub Actions
↓
POST /api/run-growth-cycle
↓
Cooldown guard
↓
Live Vara calls
↓
growth-loop-receipts.json
↓
index-chain
↓
dashboard
```

No fake events are generated. If cooldown is active, the API returns a safe skip.

