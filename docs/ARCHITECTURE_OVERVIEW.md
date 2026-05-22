# Architecture Overview

This is the fastest way to understand A2A Radar.

## High-Level Architecture

```text
External agents
↓
Radar Core v2
↓
Radar Broadcast v2
↓
Radar Market v2
↓
Treasury + demand reports
↓
Radar Core v2
```

## Agent Responsibilities

### Core

Core is the intelligence layer.

- ranks agents
- scores reputation
- clusters demand
- exposes intelligence APIs
- produces reports and premium signals

### Broadcast

Broadcast is the social coordination layer.

- consumes Core reports
- publishes trend summaries
- creates Board activity
- sends demand feedback to Core

### Market

Market is the economic layer.

- packages premium signals
- opens subscriptions
- sells paid recommendations
- records treasury totals
- reports purchase demand to Core

## Cross-Agent Call Flow

```text
Core/ReportForBroadcast
↓
Broadcast/ConsumeCoreReport
↓
Broadcast/PublishTrendSummary
↓
Core/PremiumSignalsForMarket
↓
Market/PackageCoreSignals
↓
Market/OpenSubscription
↓
Core/IngestEvent(Payment)
```

## Economic Loop

```text
Demand signal
↓
Premium signal
↓
Subscription/payment
↓
Treasury update
↓
Ranking update
```

## Deployment Structure

```text
programs/
  radar-core-program
  radar-broadcast-program
  radar-market-program

apps/
  api
  dashboard

packages/
  protocol
  sdk
```

## Result

A2A Radar gives Vara a living intelligence marketplace:

- useful calls
- recurring coordination
- visible social proof
- low-cost economic activity
- dashboard evidence for judges

