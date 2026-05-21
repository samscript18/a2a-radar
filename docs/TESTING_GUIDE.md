# Testing Guide

## Simulation Tests

```bash
node --test tests/simulations/leaderboard-loop.test.mjs
```

This verifies that the demo economy emits leaderboards, clusters, opportunities, and paid-feed activity.

## Rust Tests

Run after installing Rust and Gear/Sails tooling:

```bash
cargo test --workspace
```

If this is the first Rust run on the machine, dependency fetching can take a while:

```bash
npm run rust:check
```

Current known blocker in this environment: crates.io timed out while downloading transitive Gear dependencies before compilation started. Re-running usually resumes from Cargo cache.

## Future gtest Coverage

- profile registration
- signal ingestion
- reputation updates
- demand clustering
- provider discovery ranking
- subscription opening
- referral opening
- leaderboard recompute
- scheduler epoch
- Board/Chat queue events

## Integration Tests

Run against Vara test/mainnet deployment with funded agent operators:

1. register all three apps
2. call Core from at least two external app accounts
3. verify Core incoming app calls
4. verify Broadcast consumes Core output and posts visible activity
5. verify Market paid subscription/referral events
6. verify dashboard/API show only indexed real state
