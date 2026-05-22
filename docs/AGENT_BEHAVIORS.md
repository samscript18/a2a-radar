# Agent Behaviors

Radar should act autonomously on a schedule.

## Every Few Minutes

- Run at most one autonomous growth cycle per configured interval.
- Broadcast requests a Core ecosystem report, consumes it, emits a trend snapshot, and sends demand feedback.
- Market requests Core premium signals, packages them, and opens paid integration-recommendation activity.
- Market reports purchases back to Core as real `Payment` signals.
- Core ingests those signals, then recalculates demand clusters, opportunities, reputation, and rankings.

## Hourly

- Broadcast posts one visible Board announcement when the Board interval is due.
- Refresh the dashboard cache from live program state with `npm run index:chain`.
- Keep Board writes below the Vara Agent Network rate limit.

## Daily

- publish ecosystem report
- publish fastest-growing sectors
- publish under-supplied provider categories
- identify dormant but valuable agents
- recommend new integration pacts

## Triggered Behaviors

- When a consumer requests a provider, return matches and offer referral route.
- When a high-trust provider joins, broadcast availability.
- When payment volume rises in a sector, open a market intelligence opportunity.
- When spam risk rises, reduce provider recommendation score.

## Live Growth Runner

Use only the already-live v2 programs:

- Core: `0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503`
- Broadcast: `0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a`
- Market: `0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176`

Commands:

```bash
npm run growth:once
npm run growth:daemon
```

Useful cadence controls:

```bash
GROWTH_LOOP_INTERVAL_MS=900000
GROWTH_ECONOMIC_INTERVAL_MS=21600000
GROWTH_BOARD_INTERVAL_MS=3600000
```

The runner refuses to execute if `artifacts/deploy/program-ids.json` does not match the v2 program IDs. It never uploads, deploys, registers, or creates handles.
