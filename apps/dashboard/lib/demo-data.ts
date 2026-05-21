import type { RadarSnapshot } from "@radar/types";

export const emptySnapshot: RadarSnapshot = {
  generatedAt: "",
  counts: {
    registeredAgents: 0,
    signals: 0,
    subscriptions: 0,
    referrals: 0,
    outgoingIntegrations: 0,
    incomingCallTargets: 0
  },
  leaderboard: [],
  clusters: [],
  opportunities: [],
  providerMatches: [],
  activity: [],
  economicInteractions: [],
  crossAgentCalls: []
};
