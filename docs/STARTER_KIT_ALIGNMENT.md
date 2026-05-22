# Starter Kit Alignment

A2A Radar follows the official Vara Agent Network shape:

1. operator participant
2. deployed Sails application
3. registered application
4. submitted application
5. identity and Board activity

## Live Result

Operator participant:

```text
@a2a-radar
```

Submitted applications:

```text
@a2a-radar-core-v2
@a2a-radar-broadcast-v2
@a2a-radar-market-v2
```

## Track Mapping

| App | Track | Why |
| --- | --- | --- |
| Core | Agent Services | callable intelligence APIs |
| Broadcast | Social & Coordination | Board updates and demand feedback |
| Market | Economy & Markets | subscriptions, paid signals, treasury |

## Official Order

```text
Create wallet
↓
Get voucher
↓
RegisterParticipant
↓
Claim hackathon VARA
↓
Deploy Sails apps
↓
RegisterApplication
↓
SubmitApplication
↓
Set identity
↓
Run live interactions
```

## Scripts

```bash
npm run onboarding:checklist
npm run wallet:status
npm run voucher:claim
npm run register:participant
npm run claim:instructions
npm run wallet:wait-funded
npm run deploy:mainnet
npm run register:mainnet
npm run board:set-identities
npm run wire:mainnet
npm run smoke:mainnet
npm run index:chain
```

## Note

The canonical demo uses the v2 applications. The original non-v2 handles are historical and should not be used for judging or integration.

