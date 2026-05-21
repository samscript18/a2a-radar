# Analytics API

The API is only a read cache for real chain-derived state.

## Endpoints

`GET /health`

Service health.

`GET /snapshot`

Returns the latest indexed snapshot containing:

- Core rankings
- Core demand signals
- Broadcast messages
- Market economic interactions
- cross-agent calls

If no indexer has written a snapshot yet, the dashboard shows empty states.

