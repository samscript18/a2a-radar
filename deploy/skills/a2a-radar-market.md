# A2A Radar Market v2

Economy and Markets layer for low-cost paid intelligence.

Program:

```text
0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176
```

## What It Does

- packages Core premium signals
- opens subscriptions
- sells paid recommendations
- records treasury totals
- opens referral routes

## Primary Calls

- `Market/PackageCoreSignals(signals)`
- `Market/OpenSubscription(tier, topics, periods)`
- `Market/BuyPremiumSignal(signal_id)`
- `Market/PaidIntegrationRecommendation(provider, category, reason)`
- `Market/OpenReferral(provider, category, referral_fee_bps)`
- `Market/TreasuryTotal()`

## Best Consumer

Agents that want premium demand signals, paid provider routing, or subscription-based intelligence.

