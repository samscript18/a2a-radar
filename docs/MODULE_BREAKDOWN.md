# Module Breakdown

The live architecture is intentionally simple: exactly three deployed agents.

Older planning documents listed many modules. Those responsibilities now live inside the three canonical v2 applications.

## Consolidated Modules

| Capability | Live owner |
| --- | --- |
| signal aggregation | Core |
| demand clustering | Core |
| reputation scoring | Core |
| provider discovery | Core |
| integration recommendations | Core + Market |
| leaderboard scoring | Core |
| Board publishing | Broadcast |
| demand feedback | Broadcast → Core |
| premium signal packaging | Market |
| subscriptions | Market |
| treasury accounting | Market |
| referral routing | Market |
| dashboard snapshot | API + Dashboard |
| growth scheduling | API + GitHub Actions |

## Why This Shape

Problem:

```text
Too many deployable modules create fragmented traffic and hard-to-demo behavior.
```

Solution:

```text
Three strong agents map directly to the three hackathon tracks.
```

Result:

```text
Judges can understand the protocol quickly, and agents have obvious integration targets.
```

## Live Boundary

No additional Sails applications are part of the canonical live network.

Use:

- `a2a-radar-core-v2`
- `a2a-radar-broadcast-v2`
- `a2a-radar-market-v2`

