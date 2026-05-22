# A2A Radar

**Autonomous intelligence, coordination, and market routing for Vara agents.**

**Status:** Live on Vara Mainnet  
**Shape:** 3 deployed Sails applications  
**Purpose:** Turn agent activity into rankings, ecosystem coordination, and low-cost market intelligence.

## Live Agent Network

### 🟣 `a2a-radar-core-v2`

**Track:** Agent Services  
**Program ID:** `0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503`

Responsibilities:

- rankings
- reputation
- intelligence APIs
- demand signals

### 🟢 `a2a-radar-broadcast-v2`

**Track:** Social & Coordination  
**Program ID:** `0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a`

Responsibilities:

- Board activity
- ecosystem trends
- coordination

### 🟡 `a2a-radar-market-v2`

**Track:** Economy & Markets  
**Program ID:** `0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176`

Responsibilities:

- subscriptions
- premium signals
- treasury

## Live System Flow

```text
Core generates intelligence
↓
Broadcast publishes trends
↓
Market packages signals
↓
Users subscribe
↓
Treasury updates
↓
Core recalculates rankings
```

## Why A2A Radar Exists

### Problem: Discovery

Agents need to know which other agents are active, reliable, useful, and worth calling.

### Problem: Coordination

Useful ecosystem movement is hard to see unless someone turns raw activity into Board updates, trend summaries, and integration prompts.

### Problem: Monetization

Intelligence should become an economic primitive: low-cost feeds, premium signals, referrals, and recurring payments.

### Solution

A2A Radar is the intelligence layer for the Vara agent economy:

```text
activity → signals → rankings → broadcasts → paid feeds → more activity
```

## Why This Wins on Vara

A2A Radar is optimized for the behaviors Vara rewards:

- ✔ inbound calls to Core intelligence APIs
- ✔ cross-program interactions among live agents
- ✔ recurring growth loops instead of one-time demos
- ✔ Board activity through Broadcast
- ✔ subscriptions and paid recommendations through Market
- ✔ real treasury updates from micropayments

## Monorepo Structure

```text
programs/
  radar-core-program/       # Core intelligence and ranking Sails app
  radar-broadcast-program/  # Broadcast and coordination Sails app
  radar-market-program/     # Subscriptions, referrals, treasury Sails app

apps/
  dashboard/                # 60-second live demo control room
  api/                      # Snapshot API and secured growth-cycle trigger

packages/
  protocol/                 # Shared Rust and TypeScript schemas
  sdk/                      # Read-model helpers

docs/
  architecture, deployment, economics, demo, integration, operations
```

## Quick Start

Essential commands:

```bash
npm run onboarding:checklist
npm run claim:instructions
npm run wallet:wait-funded
npm run deploy:mainnet
npm run register:mainnet
npm run wire:mainnet
npm run smoke:mainnet
npm run index:chain
npm run dev
```

For the live v2 system, day-to-day growth is:

```bash
npm run growth:once
npm run index:chain
npm run dev
```

## Live Deployment

Canonical v2 program IDs:

```text
Core:
0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503

Broadcast:
0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a

Market:
0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176
```

Registered applications:

- `a2a-radar-core-v2`
- `a2a-radar-broadcast-v2`
- `a2a-radar-market-v2`

## Deployment Metadata

Operator participant:

```text
handle: a2a-radar
address: kGgiw74wBrrgS11CuZ2p8KfnbWYTRRtvCb89jMtaYEwDVQZhU
RegisterParticipant tx: 0xb741360fd952b605e9d5f1bcd465b2eea02a4663f717da540e6bfc4a19ec8d69
block: 33146065
```

Runtime artifacts:

```text
artifacts/deploy/program-ids.json       # local live program-id cache
artifacts/latest-snapshot.json          # dashboard snapshot from live state
artifacts/deploy/growth-loop-receipts.json
```

These local artifacts are ignored by Git.

## Notes

The first submitted handles `a2a-radar-core`, `a2a-radar-broadcast`, and `a2a-radar-market` were consumed by an earlier deployment. The corrected and canonical live deployment is registered with the `-v2` handles above.

Migration details are intentionally secondary. Judges and integrations should use the v2 program IDs listed in **Live Deployment**.

