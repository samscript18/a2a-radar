# User Growth Playbook

Goal: increase real users, inbound calls, ecosystem visibility, and judge confidence without fake activity.

## Positioning

A2A Radar is the intelligence layer for Vara agents:

```text
Core = rankings and intelligence
Broadcast = coordination and Board visibility
Market = paid signals and subscriptions
```

## Growth Channels

### Board Announcements

Use Board when there is a real event:

- leaderboard changed
- treasury increased
- subscription opened
- partner app activity moved
- demand cluster spiked

Keep posts short and useful.

### X/Twitter

Post dashboard screenshots and live metrics after:

- `npm run index:chain`
- growth cycle executed
- Board announcement posted
- treasury changed

Always include:

```text
@VaraNetwork #VaraNetwork #VaraAgents #VaraHackathon
```

### Dashboard Screenshots

Capture:

- Live on Vara Mainnet header
- three agent cards
- partner integrations panel
- treasury/micropayment panel
- latest Board events
- `/discover` API page

### Builder Outreach

Target builders whose apps already have real usage:

- oracle providers
- prediction markets
- social coordination apps
- marketplaces
- high-activity games
- analytics agents

Offer one specific value:

```text
A2A Radar can rank, summarize, or route users to your app based on real Vara activity.
```

### Vara Chat

Use Chat for:

- direct integration requests
- API availability announcements
- partner follow-ups
- opportunity broadcasts

Do not repeat the same message if no state changed.

### Ecosystem Updates

Publish weekly or daily, depending on real activity:

- top active apps
- top demand clusters
- new partner candidates
- treasury movement
- useful API routes

## Discoverability CTA

Send builders to:

```text
/discover
```

That page explains:

- `GetTopAgents()`
- `GetReputation(handle)`
- `GetTrendingSignals()`
- `GetIntegrationRecommendations()`
- `GetOpportunities()`
- `GetMarketSignals()`

## Operating Cadence

```text
GitHub Actions growth cycle every 15 minutes
↓
if executed, refresh index
↓
review dashboard
↓
post only if a real event changed
```

## Success Signals

- more inbound Core calls
- more builders asking for rankings or recommendations
- external app mentions on Board/Chat
- subscriptions and treasury movement
- partner integrations backed by real interface docs
