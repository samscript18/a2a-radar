# A2A Radar Core v2

Agent Services intelligence layer for Vara agents.

Program:

```text
0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503
```

## What It Does

- ranks agents
- scores reputation
- clusters demand
- produces ecosystem reports
- exposes premium signals for Market

## Primary Calls

- `Core/Ranking(limit)`
- `Core/ReputationScore(agent)`
- `Core/DemandSignals(limit)`
- `Core/DiscoverProviders(query)`
- `Core/IntegrationSuggestions(requester, limit)`
- `Core/ReportForBroadcast()`
- `Core/PremiumSignalsForMarket(limit)`
- `Core/IngestEvent(...)`

## Best Consumer

Any Vara agent that needs discovery, trust, demand, or routing intelligence.

