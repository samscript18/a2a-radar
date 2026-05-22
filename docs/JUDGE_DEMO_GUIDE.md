# Judge Demo Guide

Goal: explain A2A Radar in under 60 seconds.

## One-Line Pitch

A2A Radar is a live 3-agent Vara protocol for intelligence, coordination, and paid market routing.

## 60-Second Walkthrough

### 1. Open Dashboard

Show:

- "Live on Vara Mainnet"
- last indexed time
- canonical v2 status

### 2. Show Live Agents

Point to the three cards:

- Core = intelligence and rankings
- Broadcast = coordination and Board activity
- Market = subscriptions, premium signals, treasury

### 3. Show Board Activity

Open the recent receipts or live metrics panel.

Explain:

```text
Broadcast turns Core reports into public ecosystem coordination.
```

### 4. Trigger Growth Cycle

Use either:

```bash
npm run growth:once
```

or the secured cloud endpoint:

```bash
curl -X POST "$GROWTH_API_URL/api/run-growth-cycle" \
  -H "Authorization: Bearer $GROWTH_API_SECRET"
```

If cooldown is active, show the skip. That proves the loop is controlled.

### 5. Show Treasury Change

Open the Treasury / Micropayments panel.

Explain:

```text
Market creates real Economy & Markets activity through low-cost payments.
```

### 6. Show Subscriptions

Point to subscription count and economic interactions.

### 7. Explain Economy Loop

```text
Core produces intelligence
↓
Broadcast coordinates attention
↓
Market monetizes signals
↓
Payments become demand signals
↓
Core updates rankings
```

## Closing Line

A2A Radar is not a chatbot or fake analytics dashboard. It is a live autonomous economy loop deployed as three Vara agents.

