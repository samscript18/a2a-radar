import type {
  AgentProfile,
  DemandCluster,
  InteractionSignal,
  LeaderboardEntry,
  Opportunity,
  ProviderMatch,
  RadarSnapshot,
  ReputationScore
} from "@a2a-radar/protocol";

export interface RadarReadModel {
  profiles: AgentProfile[];
  signals: InteractionSignal[];
  clusters: DemandCluster[];
  reputation: ReputationScore[];
  opportunities: Opportunity[];
  leaderboard: LeaderboardEntry[];
  matches: ProviderMatch[];
}

export function buildSnapshot(model: RadarReadModel): RadarSnapshot {
  const counterparties = new Set<string>();
  for (const signal of model.signals) {
    if (signal.target) counterparties.add(`${signal.source}:${signal.target}`);
  }

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      registeredAgents: model.profiles.length,
      signals: model.signals.length,
      subscriptions: 0,
      referrals: 0,
      outgoingIntegrations: counterparties.size,
      incomingCallTargets: new Set(model.signals.map((signal) => signal.target).filter(Boolean)).size
    },
    leaderboard: model.leaderboard,
    clusters: model.clusters,
    opportunities: model.opportunities,
    providerMatches: model.matches,
    activity: model.signals.slice(-20).reverse(),
    economicInteractions: model.signals
      .filter((signal) => signal.value)
      .map((signal) => ({
        payer: signal.source,
        amount: signal.value!,
        purpose: signal.kind,
        observedAtMs: signal.observedAtMs
      })),
    crossAgentCalls: []
  };
}

export function scoreProvider(match: Pick<ProviderMatch, "matchScore" | "reputationScore">): number {
  return Math.round(match.matchScore * 0.65 + match.reputationScore * 0.35);
}
