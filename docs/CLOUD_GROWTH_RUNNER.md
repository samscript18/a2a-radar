# Cloud Growth Runner

A2A Radar can run its growth loop from a secured API endpoint instead of a local terminal.

The endpoint calls only the existing v2 programs:

- Core: `0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503`
- Broadcast: `0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a`
- Market: `0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176`

It never deploys, uploads, registers, or creates handles.

## Endpoint

```text
POST /api/run-growth-cycle
Authorization: Bearer <GROWTH_API_SECRET>
```

Example:

```bash
curl -X POST "$GROWTH_API_URL/api/run-growth-cycle" \
  -H "Authorization: Bearer $GROWTH_API_SECRET" \
  -H "Content-Type: application/json"
```

Missing or invalid tokens return `401`.

## Required Env Vars

```bash
GROWTH_API_SECRET=<strong random secret>
VARA_NETWORK=mainnet
```

For Board announcements:

```bash
REGISTRY_PID=0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3
BOARD_PID=0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3
IDL=/app/agent-network/idl/agents_network_client.idl
BOARD_IDL=/app/agent-network/idl/agents_network_client.idl
VOUCHER_ID=<voucher id>
```

For signed Vara writes, the cloud host must have `vara-wallet` available and a funded operator wallet configured. Use the same operator wallet that owns the v2 applications. Do not commit wallet secrets.

Cadence controls:

```bash
GROWTH_LOOP_INTERVAL_MS=900000
GROWTH_ECONOMIC_INTERVAL_MS=21600000
GROWTH_BOARD_INTERVAL_MS=3600000
```

GitHub Actions runs every 15 minutes. The API cooldown remains authoritative, so the cron can safely hit exactly when the 15-minute window ends.

## Railway

1. Create a Railway service from the GitHub repo.
2. Set the root directory to the repository root.
3. Install command:

```bash
npm install
```

4. Start command:

```bash
npm run api:start
```

5. Add the required env vars above.
6. Add `vara-wallet` to the build image or install it in the start/build phase if your Railway environment does not include it.
7. Configure the operator wallet securely in Railway environment or persistent volume storage.

## Render

1. Create a Render Web Service from the GitHub repo.
2. Runtime: Node.
3. Build command:

```bash
npm install
```

4. Start command:

```bash
npm run api:start
```

5. Add the required env vars above.
6. Ensure `vara-wallet` is installed and the operator wallet is configured securely.

## GitHub Actions Scheduled Trigger

The workflow lives at:

```text
.github/workflows/growth-cycle.yml
```

Add repository secrets:

```text
GROWTH_API_URL=https://your-cloud-host.example
GROWTH_API_SECRET=<same secret as cloud env>
```

The workflow runs every 15 minutes and calls:

```text
POST $GROWTH_API_URL/api/run-growth-cycle
```

## Security Warning

Do not expose this endpoint without `GROWTH_API_SECRET`. Anyone with the secret can trigger real on-chain calls and low-value VARA payments from the configured operator wallet.
