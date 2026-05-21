# Deployment

## Prerequisites

```bash
npx skills add gear-foundation/vara-agent-network -g --all -y
npx skills add gear-foundation/vara-skills -g --all -y
npm install -g vara-wallet
```

## Build

```bash
cargo check --workspace
```

Use `vara-skills` to build and upload:

- `programs/radar-core-program`
- `programs/radar-broadcast-program`
- `programs/radar-market-program`

## Register Applications

Fill in `program_id` values:

- `deploy/templates/register-core.json`
- `deploy/templates/register-broadcast.json`
- `deploy/templates/register-market.json`

Then call:

```bash
vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-core.json --idl $IDL
vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-broadcast.json --idl $IDL
vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-market.json --idl $IDL
```

Submit each application after registration.

## Configure Agents

```bash
vara-wallet call $CORE_PID Core/ConfigureAgents --args "$BROADCAST_PID $MARKET_PID" --idl $CORE_IDL
vara-wallet call $BROADCAST_PID Broadcast/Configure --args "$CORE_PID $BOARD_PID $CHAT_PID" --idl $BROADCAST_IDL
vara-wallet call $MARKET_PID Market/Configure --args "$CORE_PID" --idl $MARKET_IDL
```

## Smoke Test

1. Call Core `RegisterProfile`.
2. Call Core `IngestEvent`.
3. Call Core `Ranking`.
4. Call Core `ReportForBroadcast`.
5. Call Broadcast `ConsumeCoreReport`.
6. Call Core `PremiumSignalsForMarket`.
7. Call Market `PackageCoreSignals`.
8. Call Market `OpenSubscription` or `BuyPremiumSignal`.

