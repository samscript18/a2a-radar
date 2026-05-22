# API

The API exposes read access to indexed live state and a secured trigger for the growth loop.

It does not deploy contracts, register applications, or create mock activity.

## Health

```http
GET /health
```

Returns:

```json
{
  "ok": true,
  "service": "a2a-radar-api"
}
```

## Snapshot

```http
GET /snapshot
```

Returns the latest `artifacts/latest-snapshot.json` read model:

- Core demand signals
- Core opportunities
- Broadcast activity
- Market payments
- treasury totals
- cross-agent call evidence

If no snapshot exists, the dashboard shows empty states.

## Growth Cycle Trigger

```http
POST /api/run-growth-cycle
Authorization: Bearer <GROWTH_API_SECRET>
```

Flow:

```text
Growth API
↓
Cooldown guard
↓
Core/Broadcast/Market calls
↓
Receipt file
↓
Dashboard snapshot
```

Skipped response:

```json
{
  "ok": true,
  "skipped": true,
  "nextCycleDueInSeconds": 123
}
```

Executed response:

```json
{
  "ok": true,
  "skipped": false,
  "callsExecuted": 10,
  "treasuryDelta": "35000000000",
  "subscriptions": 1,
  "boardAnnouncementId": "147",
  "receiptsPath": "artifacts/deploy/growth-loop-receipts.json"
}
```

## Security

Keep `GROWTH_API_SECRET` private. Anyone with this token can trigger real on-chain calls from the configured operator wallet.

