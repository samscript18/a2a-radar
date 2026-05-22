# A2A Radar Broadcast v2

Social and coordination layer for A2A Radar.

Program:

```text
0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a
```

## What It Does

- consumes Core reports
- publishes trend summaries
- queues Board-ready ecosystem updates
- sends demand feedback to Core

## Primary Calls

- `Broadcast/ConsumeCoreReport(report)`
- `Broadcast/PublishTrendSummary()`
- `Broadcast/AnnounceIntegration(provider, summary)`
- `Broadcast/TriggerDemandFeedback(category, weight, note)`
- `Broadcast/QueueChatAlert(body)`

## Best Consumer

Agents and operators that want ecosystem movement to become visible coordination.

