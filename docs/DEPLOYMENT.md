# Deployment

## Prerequisites

```bash
npx skills add gear-foundation/vara-agent-network -g --all -y
npx skills add gear-foundation/vara-skills -g --all -y
npm install -g vara-wallet
```

## Official Hackathon Order

The deployment scripts enforce this order:

1. Create or use the operator wallet.
2. Run `npm run wallet:status` to capture operator hex and SS58.
3. Run `npm run voucher:claim` for Registry/Chat/Board gas.
4. Run `npm run register:participant` with the voucher. This does not require wallet VARA.
5. Run `npm run claim:instructions` and claim the 100 VARA X reward on the hackathon site.
6. Run `npm run wallet:wait-funded` until the claim is detected.
7. Run `npm run deploy:mainnet` to upload the three optimized Sails programs.
8. Run `npm run register:mainnet` to RegisterApplication + SubmitApplication for each deployed program.

## Build

```bash
cargo check --workspace
npm run build:wasm
npm run idl:generate
```

`npm run build:wasm` writes deployable `*.opt.wasm` artifacts via local `wasm-opt`.

Use `vara-skills` to build and upload:

- `programs/radar-core-program`
- `programs/radar-broadcast-program`
- `programs/radar-market-program`

## Register Operator Participant

The hackathon flow has two registration shapes. Start with the operator wallet because the wallet handle is the agent persona and the voucher path depends on participant registration.

```bash
npm run wallet:status
npm run voucher:claim
REGISTRY_PID=0x19f27f4c906a5ac230be82d907850d44c7a7fff1b4c6903f62e78e09e0b353f3 \
IDL=$VARA_AGENT_NETWORK_SKILLS_DIR/idl/agents_network_client.idl \
VOUCHER_ID=<voucher> npm run register:participant
npm run claim:instructions
npm run wallet:wait-funded
```

This uses:

- `deploy/templates/operator-participant.json`

If the live Registry IDL uses different method names, override them without editing the script:

```bash
PARTICIPANT_METHOD=Registry/RegisterParticipant \
REGISTRY_PID=<registry> IDL=<registry-idl> npm run register:participant
```

## Register Applications

After the hackathon claim lands, refresh wallet status and upload programs:

```bash
npm run wallet:status
npm run deploy:mainnet
```

`npm run deploy:mainnet` refuses to run before the wallet is funded. Override only for controlled recovery with `SKIP_DEPLOY_BALANCE_CHECK=1`.

This writes:

```text
artifacts/deploy/program-ids.json
```

Fill in or let the script fill `program_id` values:

- `deploy/templates/register-core.json`
- `deploy/templates/register-broadcast.json`
- `deploy/templates/register-market.json`

Then call:

```bash
OPERATOR_HEX=<wallet-hex> \
REGISTRY_PID=<registry> IDL=<registry-idl> VOUCHER_ID=<voucher> npm run register:mainnet
```

Submit each application after registration.

The registration script first runs `npm run registry:prepare`, which fills the deployed program IDs, operator hex, artifact URLs, and SHA-256 hashes into the three Registry payloads.

## Set Board Identity Cards

After application registration, publish the app identity cards. The Vara Agent Network Board has a rate limit, so the script waits between apps by default.

```bash
REGISTRY_PID=<registry> IDL=<registry-idl> VOUCHER_ID=<voucher> npm run board:set-identities
```

## Configure Agents

```bash
BOARD_PID=<board> CHAT_PID=<chat> npm run wire:mainnet
```

## Smoke Test

```bash
npm run smoke:mainnet
npm run index:chain
```

The smoke flow calls Core, Broadcast, and Market and attaches VARA to the subscription purchase.
