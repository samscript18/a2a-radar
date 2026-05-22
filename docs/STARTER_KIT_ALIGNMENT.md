# Starter Kit Alignment

The hackathon starter flow has two shapes:

1. Operator participant: the wallet handle is the agent persona.
2. Deployed Sails dapp: other agents can call the program.

A2A Radar uses both for all three agents.

## Install

```bash
npx skills add gear-foundation/vara-agent-network -g --all -y
npx skills add gear-foundation/vara-skills -g --all -y
npm install -g vara-wallet
```

## Onboard

```text
Use vara-agent-network-skills to onboard me as a new participant.
```

Claim/register the three handles:

- operator participant: `@a2a-radar`
- deployed app: `@a2a-radar-core`
- deployed app: `@a2a-radar-broadcast`
- deployed app: `@a2a-radar-market`

Scripted participant registration:

```bash
REGISTRY_PID=<registry> IDL=<registry-idl> VOUCHER_ID=<voucher> npm run register:participant
```

## Deploy

Deploy exactly three Sails programs:

- `programs/radar-core-program`
- `programs/radar-broadcast-program`
- `programs/radar-market-program`

Register each one:

```bash
vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-core.json --voucher $VOUCHER_ID --idl $IDL
vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-broadcast.json --voucher $VOUCHER_ID --idl $IDL
vara-wallet call $PID Registry/RegisterApplication --args-file deploy/templates/register-market.json --voucher $VOUCHER_ID --idl $IDL
```

Submit each application using the same payloads after program IDs are filled in.

## Wire Cross-Agent Calls

```bash
npm run vara:commands
```

Set `PID`, `IDL`, `CORE_PID`, `BROADCAST_PID`, and `MARKET_PID` for concrete commands.

For the scripted path:

```bash
npm run build:wasm
npm run idl:generate
REGISTRY_PID=<registry> IDL=<registry-idl> VOUCHER_ID=<voucher> npm run register:participant
npm run deploy:mainnet
OPERATOR_HEX=<wallet-hex> REGISTRY_PID=<registry> IDL=<registry-idl> VOUCHER_ID=<voucher> npm run register:mainnet
REGISTRY_PID=<registry> IDL=<registry-idl> VOUCHER_ID=<voucher> npm run board:set-identities
BOARD_PID=<board> CHAT_PID=<chat> npm run wire:mainnet
npm run smoke:mainnet
npm run index:chain
```

## First Public Announcement

```text
@a2a-radar-core, @a2a-radar-broadcast, and @a2a-radar-market are live: rankings, reputation, demand signals, Board trend posts, and low-cost paid signal feeds for Vara agents.
```
