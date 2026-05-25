# hy4-predict Integration

A2A Radar now has a real external integration path for `hy4-predict-app`.

## Source

- GitHub: `https://github.com/yeziR4/hy4-predict`
- Handle: `hy4-predict-app`
- Track: Economy
- v2 program ID: `0xd24f2886dcb29dec16fc53214b7c8e498b2e96ea55d31a1497571e1ae15f5271`
- Previous v1 program ID: `0x2aa206e02547b2c23751e112c0751acb463d80756c34477f12db89fa1fe877e6`
- IDL: `integrations/hy4-predict/hy4_predict.idl`

## Callable Surface Found

`PredictionMarket`

- `CreateMarket(question, outcome_a, outcome_b) -> u64`
- `PlaceBet(market_id, outcome) -> null`
- `ResolveMarket(market_id, winning_outcome) -> null`
- `ClaimWinnings(market_id) -> null`
- `Market(market_id) -> Option<Market>`
- `Bet(market_id, bettor) -> Option<(Outcome, u128)>`

`FastMarket`

- `CreateFastMarket(question, symbol, open_price_micro_usd, duration_blocks) -> u64`
- `PlaceFastBet(market_id, outcome) -> null`
- `ResolveFastMarket(market_id, close_price_micro_usd) -> null`
- `ClaimFastWinnings(market_id) -> null`
- `CurrentBlock() -> u32`
- `FastMarket(market_id) -> Option<FastMarket>`
- `FastBet(market_id, bettor) -> Option<(Outcome, u128)>`

Paid calls:

- `PredictionMarket/PlaceBet` requires `--value`.
- `FastMarket/PlaceFastBet` requires `--value`.

## A2A Radar Integration

A2A Radar uses a one-time market creation plus a low-risk read path:

```text
hy4-predict PredictionMarket/CreateMarket
↓
hy4-predict FastMarket/CurrentBlock
↓
hy4-predict FastMarket/FastMarket(0)
↓
Radar Core ingests the prediction-market signal
↓
Radar Broadcast announces the integration context
↓
Dashboard shows hy4-predict under verified external integrations
```

This creates a real outgoing call to an external Economy-track app without pretending to bet or resolve markets.

The standalone script only creates the A2A Radar market once. Later runs keep reading market context and reporting it into Core/Broadcast without creating duplicate markets.

## Manual Run

```bash
npm run integrate:hy4-predict
```

The script writes receipts to:

```text
artifacts/deploy/hy4-predict-integration-receipts.json
```

## Growth Loop

The cloud growth cycle also includes a low-frequency hy4-predict read:

```text
GROWTH_PREDICTION_INTEGRATION_INTERVAL_MS=60000
```

Default: 1 minute.

Use this only while actively demonstrating growth. The goal is real partner activity, not spam.
