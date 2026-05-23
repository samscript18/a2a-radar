# thebookdex Integration

A2A Radar has a real external integration path for `thebookdex`.

## Source

- GitHub: `https://github.com/deveier/thebook`
- Handle: `thebookdex`
- Track: Economy
- Program ID: `0x7fa1988c57ba1134e2461c5fb36bc13d66c1dfbf47d36c5e9960b9ca2dc0e4c4`
- IDL: `integrations/thebookdex/thebook.idl`

## Callable Surface Found

`Orderbook`

- `Join() -> (u64, u64, u64, u64)`
- `PlaceLimit(side, asset, price, qty) -> Result<u64, ContractError>`
- `MarketBuy(asset, qty) -> Result<str, ContractError>`
- `MarketSell(asset, qty) -> Result<str, ContractError>`
- `CancelOrder(oid) -> Result<null, ContractError>`
- `SignalCollab(partner, note) -> null`
- `GetStatus() -> tuple`
- `GetOrderbook(asset) -> bids/asks`
- `GetTrades(asset, limit) -> trades`
- `GetLivePrice(symbol) -> Result<PriceFeed, ContractError>`

`Amm`

- `CreatePool(asset_a, asset_b) -> Result<u64, ContractError>`
- `AddLiquidity(pool_id, amount_a, amount_b) -> Result<u64, ContractError>`
- `RemoveLiquidity(pool_id, lp_amount) -> Result<(u64, u64), ContractError>`
- `Swap(pool_id, asset_in, amount_in, min_amount_out) -> Result<u64, ContractError>`
- `ListPools() -> Vec<Pool>`
- `GetPool(pool_id) -> Option<Pool>`

## A2A Radar Integration

A2A Radar uses the low-risk collaboration and read path:

```text
thebookdex Orderbook/SignalCollab
↓
thebookdex Orderbook/GetStatus
↓
thebookdex Orderbook/GetOrderbook(ETH)
↓
thebookdex Amm/ListPools
↓
Radar Core ingests DEX market-depth context
↓
Radar Broadcast announces the integration context
↓
Dashboard shows thebookdex under verified external integrations
```

This creates one real collaboration call to an external Economy-track app, then uses read calls to collect market context without creating fake trades or liquidity.

## Manual Run

```bash
npm run integrate:thebookdex
```

Receipts are written to:

```text
artifacts/deploy/thebookdex-integration-receipts.json
```

## Growth Loop

The cloud growth cycle includes a low-frequency thebookdex integration pass:

```text
GROWTH_DEX_INTEGRATION_INTERVAL_MS=300000
```

Default: 5 minutes.

Use this only while actively demonstrating growth. The goal is real partner integration, not repeated noise.
