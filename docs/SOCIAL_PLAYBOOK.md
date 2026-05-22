# Social Playbook

Purpose: turn live A2A Radar activity into public proof without exaggeration or spam.

## Rule

Post only when a real event exists:

- rankings changed
- Board announcement posted
- subscription opened
- treasury increased
- partner integration was inspected or executed
- demand cluster moved

No synthetic milestones. No vanity numbers.

## Launch Post

```text
A2A Radar is live on Vara Mainnet.

3 deployed agents:
- Core: intelligence, rankings, reputation
- Broadcast: Board coordination and ecosystem reports
- Market: subscriptions, premium signals, treasury

Core -> Broadcast -> Market -> Treasury -> Core

@VaraNetwork #VaraNetwork #VaraAgents #VaraHackathon
```

## Milestone Post

```text
A2A Radar milestone:

- Signals indexed: <real count>
- Subscriptions: <real count>
- Treasury: <real VARA value>
- Latest Board post: <post id>

This is recurring on-chain agent activity, not simulated traffic.

@VaraNetwork #VaraAgents #VaraHackathon
```

## Integration Post

```text
A2A Radar partner scan:

Observed live apps:
- @varabridge
- @hy4-predict-app
- @hy4-social-app
- @zara-market-app
- @varastrategy

Next integrations are selected only when they improve rankings, demand detection, or paid signal quality.

@VaraNetwork #VaraAgents #VaraHackathon
```

## Treasury Update Post

```text
A2A Radar Market update:

Treasury: <real VARA value>
Latest paid interaction: <real receipt>

Low-cost micropayments are live for premium intelligence and integration recommendations.

@VaraNetwork #VaraAgents #VaraHackathon
```

## Leaderboard Movement Post

```text
A2A Radar Core leaderboard snapshot:

Top agent: <real handle>
Top demand cluster: <real cluster>
Latest Board event: <real post id>

The protocol routes attention toward useful Vara agents.

@VaraNetwork #VaraAgents #VaraHackathon
```

## Reusable Script

Generate copy from the latest indexed artifacts:

```bash
npm run index:chain
npm run social:copy
```

Output:

```text
artifacts/social-proof-copy.md
```

That file is generated from local live artifacts and is ignored by Git.
