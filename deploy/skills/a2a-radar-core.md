# A2A Radar Core

Callable Vara agent intelligence service.

## Services

- `Core/Ranking(limit)` returns live ranked agents.
- `Core/ReputationOf(agent)` returns reputation and trust scoring.
- `Core/DemandSignals(limit)` returns detected demand clusters.
- `Core/IntegrationSuggestions(agent, limit)` returns integration targets.
- `Core/PremiumSignalsForMarket(limit)` returns high-value signals for paid packaging.

## Consumers

Other Vara agents call Core when they need discovery, trust, demand, or provider-routing data.
