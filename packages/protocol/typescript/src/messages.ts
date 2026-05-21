export type ServiceCategory =
  | "Oracle"
  | "Prediction"
  | "Casino"
  | "Analytics"
  | "Social"
  | "Marketplace"
  | "Reputation"
  | "Dao"
  | "Registry"
  | "Tooling"
  | { Other: string };

export type SignalKind =
  | "IncomingCall"
  | "OutgoingCall"
  | "Payment"
  | "BoardPost"
  | "ChatPost"
  | "Registration"
  | "IntegrationPact"
  | "ReputationAttestation"
  | "DemandRequest"
  | "ProviderResponse";

export type FeedTopic =
  | "EcosystemPulse"
  | "DemandSpikes"
  | "ProviderDiscovery"
  | "Leaderboards"
  | "ReputationRisk"
  | "IntegrationOpportunities"
  | "SectorHeatmaps";

export type SubscriptionTier = "Free" | "Pulse" | "Pro" | "Sponsor";

export type RadarAgentKind = "Core" | "Broadcast" | "Market";

export interface Money {
  amount: string;
  asset: "VARA";
}

export interface AgentProfile {
  agent: string;
  program?: string;
  handle: string;
  categories: ServiceCategory[];
  description: string;
  endpointHint: string;
  verified: boolean;
  lastSeenMs: number;
}

export interface InteractionSignal {
  id: number;
  kind: SignalKind;
  source: string;
  target?: string;
  category: ServiceCategory;
  value?: Money;
  weight: number;
  metadata: string;
  observedAtMs: number;
}

export interface DemandCluster {
  sector: number;
  label: string;
  category: ServiceCategory;
  demandScore: number;
  supplyScore: number;
  growthBps: number;
  sampleSize: number;
  updatedAtMs: number;
}

export interface ReputationScore {
  agent: string;
  trustScore: number;
  reliabilityScore: number;
  spamRisk: number;
  successfulInteractions: number;
  uniqueCounterparties: number;
  updatedAtMs: number;
}

export interface ProviderMatch {
  provider: string;
  handle: string;
  category: ServiceCategory;
  matchScore: number;
  reputationScore: number;
  estimatedFee?: Money;
  reason: string;
}

export interface LeaderboardEntry {
  agent: string;
  handle: string;
  rank: number;
  score: number;
  incomingCalls: number;
  outgoingCalls: number;
  uniqueCounterparties: number;
  repeatCounterparties: number;
  paymentVolume: string;
  boardActivity: number;
  integrationDepth: number;
  sustainedActivity: number;
}

export interface Opportunity {
  id: number;
  title: string;
  category: ServiceCategory;
  demandScore: number;
  suggestedProviders: string[];
  expectedValue?: Money;
  expiresAtMs: number;
}

export interface IntegrationSuggestion {
  requester: string;
  provider: string;
  category: ServiceCategory;
  confidence: number;
  reason: string;
}

export interface PremiumSignal {
  id: number;
  title: string;
  category: ServiceCategory;
  confidence: number;
  price: Money;
  summary: string;
}

export interface BroadcastMessage {
  title: string;
  body: string;
  topic: FeedTopic;
  sourceReport?: EcosystemReport;
  createdAtMs: number;
}

export interface MarketProduct {
  id: number;
  name: string;
  topic: FeedTopic;
  price: Money;
  active: boolean;
}

export interface EcosystemReport {
  title: string;
  summary: string;
  topAgents: LeaderboardEntry[];
  hotClusters: DemandCluster[];
  opportunities: Opportunity[];
  createdAtMs: number;
}

export interface RadarSnapshot {
  generatedAt: string;
  counts: {
    registeredAgents: number;
    signals: number;
    subscriptions: number;
    referrals: number;
    outgoingIntegrations: number;
    incomingCallTargets: number;
  };
  leaderboard: LeaderboardEntry[];
  clusters: DemandCluster[];
  opportunities: Opportunity[];
  providerMatches: ProviderMatch[];
  activity: InteractionSignal[];
  economicInteractions: Array<{
    payer: string;
    amount: Money;
    purpose: string;
    observedAtMs: number;
  }>;
  crossAgentCalls: Array<{
    from: RadarAgentKind;
    to: RadarAgentKind;
    purpose: string;
    observedAtMs: number;
  }>;
}

export const LOW_COST_TIERS = {
  free: "0 VARA",
  pulse: "about cents per period",
  pro: "low cents per period",
  sponsor: "small sponsorship fee"
} as const;
