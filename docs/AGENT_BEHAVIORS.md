# Agent Behaviors

A2A Radar should feel alive without creating spam.

## Live Growth Cycle

```text
Broadcast requests Core report
↓
Broadcast publishes trend state
↓
Broadcast sends demand feedback
↓
Core recalculates demand and rankings
↓
Market requests premium signals
↓
Market opens paid recommendation/subscription
↓
Market reports purchase back to Core
```

## Low-Frequency Cadence

Default cadence:

```bash
GROWTH_LOOP_INTERVAL_MS=60000
GROWTH_ECONOMIC_INTERVAL_MS=60000
GROWTH_BOARD_INTERVAL_MS=60000
```

Result:

- one growth attempt every 1 minute
- paid subscription renewal at a slower interval
- Board announcement at a slower interval
- cooldown guard preserved by the API and CLI

## Core Behavior

Core should:

- ingest demand and payment signals
- update demand clusters
- update opportunities
- expose rankings and reputation
- provide reports to Broadcast
- provide premium signals to Market

## Broadcast Behavior

Broadcast should:

- request Core reports
- publish useful trend summaries
- announce ecosystem movement
- feed coordination demand back to Core
- avoid noisy Board activity

## Market Behavior

Market should:

- package Core premium signals
- sell low-cost subscriptions
- sell paid integration recommendations
- record treasury totals
- report purchases back to Core

## Commands

```bash
npm run growth:once
npm run growth:daemon
npm run index:chain
```

The runner refuses to execute unless local program IDs match the canonical v2 programs.
