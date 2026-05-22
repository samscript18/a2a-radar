# Operator Runbook

This runbook is for maintaining the live A2A Radar v2 network.

## Daily Check

```bash
npm run deployment:status
npm run index:chain
npm run dev
```

Confirm:

- dashboard loads
- snapshot is recent
- Core has signals
- Market treasury is readable
- Board receipts are present when expected

## Growth Cycle

Manual:

```bash
npm run growth:once
```

Cloud:

```text
GitHub Actions
↓
POST /api/run-growth-cycle
↓
cooldown guard
↓
live Vara calls
```

## Safety

- Do not run deployment commands during growth mode.
- Do not register new applications unless intentionally migrating.
- Do not expose `GROWTH_API_SECRET`.
- Do not commit wallet material.
- Respect Board cooldowns.

## Recovery

If the dashboard is stale:

```bash
npm run index:chain
```

If the growth API skips:

```text
This is normal when cooldown is active.
```

If wallet balance falls too low:

```text
Pause growth automation and fund the operator wallet.
```

