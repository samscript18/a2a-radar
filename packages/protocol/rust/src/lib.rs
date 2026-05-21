#![no_std]

extern crate alloc;

use alloc::{string::String, vec::Vec};
use gstd::ActorId;
use parity_scale_codec::{Decode, Encode};
use scale_info::TypeInfo;

pub type AgentId = ActorId;
pub type ProgramId = ActorId;
pub type SectorId = u32;
pub type SignalId = u64;
pub type OpportunityId = u64;
pub type SubscriptionId = u64;
pub type ReferralId = u64;
pub type TimestampMs = u64;

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub enum RadarAgentKind {
    Core,
    Broadcast,
    Market,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub enum ServiceCategory {
    Oracle,
    Prediction,
    Casino,
    Analytics,
    Social,
    Marketplace,
    Reputation,
    Dao,
    Registry,
    Tooling,
    Other(String),
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub enum SignalKind {
    IncomingCall,
    OutgoingCall,
    Payment,
    BoardPost,
    ChatPost,
    Registration,
    IntegrationPact,
    ReputationAttestation,
    DemandRequest,
    ProviderResponse,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub enum Priority {
    Low,
    Normal,
    High,
    Critical,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub enum SubscriptionTier {
    Free,
    Pulse,
    Pro,
    Sponsor,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub enum FeedTopic {
    EcosystemPulse,
    DemandSpikes,
    ProviderDiscovery,
    Leaderboards,
    ReputationRisk,
    IntegrationOpportunities,
    SectorHeatmaps,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct Money {
    pub amount: u128,
    pub asset: String,
}

impl Money {
    pub fn vara(amount: u128) -> Self {
        Self { amount, asset: String::from("VARA") }
    }
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct AgentProfile {
    pub agent: AgentId,
    pub program: Option<ProgramId>,
    pub handle: String,
    pub categories: Vec<ServiceCategory>,
    pub description: String,
    pub endpoint_hint: String,
    pub verified: bool,
    pub last_seen_ms: TimestampMs,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct InteractionSignal {
    pub id: SignalId,
    pub kind: SignalKind,
    pub source: AgentId,
    pub target: Option<AgentId>,
    pub category: ServiceCategory,
    pub value: Option<Money>,
    pub weight: u32,
    pub metadata: String,
    pub observed_at_ms: TimestampMs,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct DemandCluster {
    pub sector: SectorId,
    pub label: String,
    pub category: ServiceCategory,
    pub demand_score: u32,
    pub supply_score: u32,
    pub growth_bps: i32,
    pub sample_size: u32,
    pub updated_at_ms: TimestampMs,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct ReputationScore {
    pub agent: AgentId,
    pub trust_score: u32,
    pub reliability_score: u32,
    pub spam_risk: u32,
    pub successful_interactions: u32,
    pub unique_counterparties: u32,
    pub updated_at_ms: TimestampMs,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct ProviderMatch {
    pub provider: AgentId,
    pub handle: String,
    pub category: ServiceCategory,
    pub match_score: u32,
    pub reputation_score: u32,
    pub estimated_fee: Option<Money>,
    pub reason: String,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct ProviderQuery {
    pub requester: AgentId,
    pub category: ServiceCategory,
    pub need: String,
    pub max_fee: Option<Money>,
    pub min_reputation: u32,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct IntegrationSuggestion {
    pub requester: AgentId,
    pub provider: AgentId,
    pub category: ServiceCategory,
    pub confidence: u32,
    pub reason: String,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct PremiumSignal {
    pub id: SignalId,
    pub title: String,
    pub category: ServiceCategory,
    pub confidence: u32,
    pub price: Money,
    pub summary: String,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct Opportunity {
    pub id: OpportunityId,
    pub title: String,
    pub category: ServiceCategory,
    pub demand_score: u32,
    pub suggested_providers: Vec<AgentId>,
    pub expected_value: Option<Money>,
    pub expires_at_ms: TimestampMs,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct Subscription {
    pub id: SubscriptionId,
    pub subscriber: AgentId,
    pub tier: SubscriptionTier,
    pub topics: Vec<FeedTopic>,
    pub price_per_period: Money,
    pub active_until_ms: TimestampMs,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct ReferralRoute {
    pub id: ReferralId,
    pub requester: AgentId,
    pub provider: AgentId,
    pub category: ServiceCategory,
    pub referral_fee_bps: u16,
    pub status: String,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct LeaderboardEntry {
    pub agent: AgentId,
    pub handle: String,
    pub rank: u32,
    pub score: u32,
    pub incoming_calls: u32,
    pub outgoing_calls: u32,
    pub unique_counterparties: u32,
    pub repeat_counterparties: u32,
    pub payment_volume: u128,
    pub board_activity: u32,
    pub integration_depth: u32,
    pub sustained_activity: u32,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct EcosystemReport {
    pub title: String,
    pub summary: String,
    pub top_agents: Vec<LeaderboardEntry>,
    pub hot_clusters: Vec<DemandCluster>,
    pub opportunities: Vec<Opportunity>,
    pub created_at_ms: TimestampMs,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct BroadcastMessage {
    pub title: String,
    pub body: String,
    pub topic: FeedTopic,
    pub source_report: Option<EcosystemReport>,
    pub created_at_ms: TimestampMs,
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub struct MarketProduct {
    pub id: u64,
    pub name: String,
    pub topic: FeedTopic,
    pub price: Money,
    pub active: bool,
}

#[sails_rs::event]
#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub enum RadarEvent {
    AgentObserved(AgentProfile),
    SignalIngested(InteractionSignal),
    DemandClusterUpdated(DemandCluster),
    ReputationUpdated(ReputationScore),
    ProviderMatched { query: ProviderQuery, matches: Vec<ProviderMatch> },
    OpportunityPublished(Opportunity),
    SubscriptionOpened(Subscription),
    PaymentCaptured { payer: AgentId, amount: Money, purpose: String },
    ReferralOpened(ReferralRoute),
    LeaderboardUpdated { board: String, entries: Vec<LeaderboardEntry> },
    EcosystemReportPublished(EcosystemReport),
    IntegrationRecommended { requester: AgentId, provider: AgentId, reason: String },
    BoardMessageQueued { topic: FeedTopic, body: String },
    ChatMessageQueued { priority: Priority, body: String },
    CrossAgentCallQueued { from: RadarAgentKind, to: RadarAgentKind, purpose: String },
    PremiumSignalPackaged(PremiumSignal),
    MarketProductCreated(MarketProduct),
}

#[derive(Clone, Debug, Decode, Encode, Eq, PartialEq, TypeInfo)]
pub enum RadarError {
    NotAuthorized,
    NotFound,
    InvalidPayment,
    SubscriptionExpired,
    Duplicate,
    BadInput,
    RateLimited,
}

pub const CENTS_VARA_MICRO_PRICE: u128 = 10_000_000_000;
pub const PULSE_PRICE_PER_PERIOD: u128 = 25_000_000_000;
pub const PRO_PRICE_PER_PERIOD: u128 = 75_000_000_000;
