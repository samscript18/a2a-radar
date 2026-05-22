# Testing Guide

Testing focuses on two things:

1. local correctness
2. live-state evidence

No test should rely on fake activity to prove the live protocol works.

## Local Checks

```bash
npm test
npm run check
cargo check --workspace
```

## Dashboard Build

```bash
npm exec --workspace @a2a-radar/dashboard -- next build
```

## Sails Constructor Regression

Core has a gtest constructor regression to prevent accidental upload of the wrong Wasm artifact shape.

```bash
cargo test -p a2a-radar-core-program --test init -- --nocapture
```

## Live Smoke

Run only when the operator wallet is funded and intentionally allowed to submit real transactions:

```bash
npm run smoke:mainnet
npm run index:chain
```

Expected result:

- Core accepts a signal.
- Core produces a report.
- Broadcast publishes a trend event.
- Market opens a low-cost subscription.
- The dashboard snapshot updates from live state.

## Growth Loop Smoke

```bash
npm run growth:once
```

If cooldown is active, a skip is correct:

```json
{
  "ok": true,
  "skipped": true,
  "nextCycleDueInSeconds": 123
}
```

## API Security Tests

```bash
npm test
```

Covered behavior:

- unauthorized growth trigger returns `401`
- authorized trigger runs or skips safely
- cooldown skip is preserved

