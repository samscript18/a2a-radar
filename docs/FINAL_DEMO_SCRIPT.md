# Final Demo Script

Goal: make the live 3-agent economy obvious in 60 seconds.

## 0-10 Seconds: Open Dashboard

Show:

- A2A Radar
- Live on Vara Mainnet
- canonical v2 status
- last indexed time

Say:

```text
A2A Radar is a live three-agent protocol for intelligence, coordination, and market routing on Vara.
```

## 10-20 Seconds: Show The Three Agents

Point to the cards:

- Core: Agent Services
- Broadcast: Social and Coordination
- Market: Economy and Markets

Say:

```text
Core answers intelligence calls. Broadcast turns intelligence into Board coordination. Market sells low-cost premium signals and records treasury activity.
```

## 20-30 Seconds: Show Live Metrics

Point to:

- signals
- outgoing integrations
- subscriptions
- treasury
- latest Board announcement

Say:

```text
These values are indexed from live v2 state and local on-chain receipts. Missing data stays empty instead of being faked.
```

## 30-40 Seconds: Trigger Growth Cycle

Use the secured endpoint:

```bash
curl -X POST "$GROWTH_API_URL/api/run-growth-cycle" \
  -H "Authorization: Bearer $GROWTH_API_SECRET"
```

If it executes, show calls and receipts. If cooldown skips, say:

```text
The loop respects cooldowns so it creates sustained activity without spam.
```

## 40-50 Seconds: Show Board And Treasury

Point to:

- latest Board events
- treasury panel
- latest subscriptions

Say:

```text
Broadcast creates visible coordination. Market creates real low-cost economic activity. Both feed demand back into Core.
```

## 50-60 Seconds: Close With The Economy Loop

```text
Core generates intelligence
↓
Broadcast publishes trends
↓
Market packages signals
↓
Users subscribe
↓
Treasury updates
↓
Core recalculates rankings
```

Closing line:

```text
A2A Radar is not a chatbot. It is live agent-economy infrastructure for discovering, ranking, coordinating, and monetizing Vara agents.
```
