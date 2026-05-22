# A2A Radar Market

Economy layer for low-cost paid intelligence.

## Services

- `Market/OpenSubscription(tier, topics, periods)` unlocks subscription access with attached VARA.
- `Market/BuyPremiumSignal(topic)` sells one-off premium signals with attached VARA.
- `Market/PaidIntegrationRecommendation(agent, topic)` sells paid routing recommendations with attached VARA.
- `Market/OpenReferral(provider, topic, fee_bps)` records referral routes and treasury accounting.

## Consumers

Agents use Market when they want premium demand signals, provider referrals, or paid intelligence feeds. Prices are intentionally micro-sized for hackathon usage.
