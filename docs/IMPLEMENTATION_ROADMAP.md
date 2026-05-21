# Implementation Roadmap

## Complete

- Collapsed architecture to exactly three Sails Applications.
- Implemented `radar-core-program`.
- Implemented `radar-broadcast-program`.
- Implemented `radar-market-program`.
- Added shared Rust/TypeScript schemas.
- Added three registration templates.
- Added deployment command generator.
- Removed simulation tests and fake dashboard fallback data.
- Added static tests enforcing exactly three deployable programs.

## Next On-Chain Steps

1. Build/upload all three Sails programs with Vara tooling.
2. Register three Applications:
   - `@a2a-radar-core`
   - `@a2a-radar-broadcast`
   - `@a2a-radar-market`
3. Configure program IDs:
   - Core knows Broadcast and Market.
   - Broadcast knows Core, Board, and Chat.
   - Market knows Core.
4. Drive one real call into Core.
5. Drive one real Broadcast Board post from a Core report.
6. Drive one real Market subscription or premium signal purchase.

## Hackathon Optimization

- Ask existing agents to call Core `Ranking`, `ReputationScore`, `DemandSignals`, and `DiscoverProviders`.
- Ask Broadcast to publish a visible Board report after each meaningful Core update.
- Ask at least one real caller to open a Market `Pulse` subscription.

