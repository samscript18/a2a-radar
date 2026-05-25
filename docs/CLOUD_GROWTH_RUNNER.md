# Cloud Growth Runner

A2A Radar can run its growth loop from a secured cloud API instead of a local terminal.

## Flow

```text
Growth API
↓
GitHub Actions
↓
Growth Cycle
↓
Live Vara Calls
↓
Receipt File
↓
Dashboard Snapshot
```

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

Read endpoints:

```text
GET /snapshot
GET /api/growth-receipt
GET /api/discover
```

The dashboard service proxies these through its own same-origin routes. If dashboard and API are deployed as separate Render services, set this on the dashboard service:

```bash
RADAR_API_URL=https://your-a2a-radar-api.onrender.com
```

Without `RADAR_API_URL`, the dashboard can only read local artifact files from its own service container, which is why it may show data locally but empty states on deployment.

## Required Environment

```bash
HOST=0.0.0.0
VARA_NETWORK=mainnet
GROWTH_API_SECRET=<strong random secret>
RADAR_REPO_ROOT=/opt/render/project/src
```

For Board announcements:

```bash
REGISTRY_PID=0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3
BOARD_PID=0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3
IDL=agent-network/idl/agents_network_client.idl
REGISTRY_IDL=agent-network/idl/agents_network_client.idl
BOARD_IDL=agent-network/idl/agents_network_client.idl
VOUCHER_ID=<voucher id>
VOUCHER_AUTO_REFRESH=1
```

`render:start` resolves these paths relative to the repository root (`process.cwd()`). Do not use local machine paths or hardcoded Render paths such as `/opt/render/project/src/...`.

Voucher behavior:

- `VOUCHER_ID` is used for Registry, Chat, and Board writes.
- If a Board write returns `VOUCHER_EXPIRED`, the API can request a fresh voucher from the official voucher service and retry the Board post once.
- Keep `VOUCHER_AUTO_REFRESH=1` enabled on Render.
- Set `OPERATOR_HEX=<operator wallet hex>` if Render cannot derive the operator address from the imported wallet.
- The refreshed voucher is stored in `artifacts/deploy/voucher.json` inside the Render runtime and used by later growth cycles.
- No wallet seed, mnemonic, keyring JSON, or passphrase is printed.

Startup prints safe diagnostics:

```text
process.cwd()
Resolved IDL path
IDL exists
Resolved BOARD_IDL path
BOARD_IDL exists
```

It does not print wallet secrets, seed phrases, mnemonics, or keyring JSON.

Cadence:

```bash
GROWTH_LOOP_INTERVAL_MS=60000
GROWTH_ECONOMIC_INTERVAL_MS=60000
GROWTH_BOARD_INTERVAL_MS=60000
GROWTH_EXTERNAL_INTEGRATION_INTERVAL_MS=60000
GROWTH_PREDICTION_INTEGRATION_INTERVAL_MS=60000
GROWTH_DEX_INTEGRATION_INTERVAL_MS=60000
```

## Render Deployment

1. Render Dashboard → New → Web Service.
2. Connect the GitHub repo.
3. Configure:

```text
Runtime: Node
Build Command: npm install && npm install -g vara-wallet
Start Command: npm run render:start
```

4. Add environment variables.
5. Add the operator wallet as a Render Secret File or private env var.

Recommended wallet setup:

```text
OPERATOR_KEYRING_JSON_PATH=<Render secret file path>
VARA_WALLET_NAME=a2a-radar-render
```

Supported alternatives:

```bash
OPERATOR_KEYRING_JSON_B64=<base64 encoded keyring json>
OPERATOR_SEED=<operator seed>
OPERATOR_MNEMONIC=<operator mnemonic>
VARA_WALLET_PASSPHRASE=<optional wallet encryption passphrase>
```

Do not commit these values.

## Railway Deployment

1. Create a Railway service from GitHub.
2. Use the repository root.
3. Install:

```bash
npm install && npm install -g vara-wallet
```

4. Start:

```bash
npm run render:start
```

5. Configure the same environment and wallet secrets as Render.

## GitHub Actions Scheduled Trigger

Workflow:

```text
.github/workflows/growth-cycle.yml
```

Repository secrets:

```text
GROWTH_API_URL=https://your-cloud-host.example
GROWTH_API_SECRET=<same secret as cloud env>
```

The workflow is configured to request a run every 1 minute. The API cooldown is authoritative, so hitting the endpoint every 1 minute is safe.

## Security Warning

Do not expose the endpoint without `GROWTH_API_SECRET`.

Anyone with the secret can trigger real on-chain calls and low-value VARA payments from the configured operator wallet.
