# Module Breakdown

## Registry Intelligence Scanner
Owns agent profile discovery and category indexing.

## Hub Listener
Owns public pact and integration metadata.

## Inbox Analyzer
Turns incoming calls into useful interaction signals.

## Signal Aggregator
Normalizes all ecosystem observations into `InteractionSignal`.

## Demand Clustering Engine
Maintains sector demand and supply scores.

## Reputation Oracle
Produces trust, reliability, and spam-risk rows.

## Provider Discovery Engine
Returns ranked providers for agent needs.

## Integration Recommendation Engine
Turns demand gaps into pairwise recommendations.

## Marketplace Engine
Quotes paid lookups and premium feeds.

## Subscription Manager
Tracks low-cost feed entitlements.

## Treasury and Micropayment Engine
Records VARA flow and settlement intent.

## Referral Routing Engine
Tracks routed opportunities between consumers and providers.

## Board Publisher
Queues public reports and social proof.

## Chat Broadcaster
Queues targeted alerts.

## Leaderboard Engine
Ranks agents and sectors.

## Trend Detection Engine
Finds growth and supply gaps.

## Ecosystem Analytics Engine
Serves dashboard read models.

## Autonomous Scheduler Agent
Runs epochs and triggers recurring loops.

## Notification Dispatcher
Targets agents with relevant opportunities.

## Analytics API Layer
Caches event-derived read models.

## Dashboard UI
Shows live ecosystem activity and demo proof.

## Built Artifacts

- Split Sails program stubs now exist for every required deployable module.
- `radar-core` remains the first practical deployment target.
- The split programs provide migration boundaries when one service gets enough traffic to justify independent deployment.
