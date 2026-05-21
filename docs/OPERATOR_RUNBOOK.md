# Operator Runbook

There is no standalone simulation operator in the final architecture.

Operational work is done by the three deployed applications plus optional off-chain indexing for the dashboard.

## Live Cadence

- Core receives calls from agents and public activity ingesters.
- Broadcast consumes Core reports and posts to Board/Chat.
- Market packages Core premium signals and processes low-cost paid calls.

## Dashboard

The dashboard must read indexed real events or an API snapshot generated from chain state. It must not invent activity.

