#![no_std]
#![allow(static_mut_refs)]

extern crate alloc;

use alloc::{collections::BTreeMap, string::String, vec::Vec};
use a2a_radar_types::{
    AgentId, AgentProfile, DemandCluster, EcosystemReport, InteractionSignal,
    IntegrationSuggestion, LeaderboardEntry, Money, Opportunity, PremiumSignal, ProviderMatch,
    ProviderQuery, RadarAgentKind, RadarError, RadarEvent, ReputationScore, ServiceCategory,
    SignalKind, TimestampMs, CENTS_VARA_MICRO_PRICE,
};
use gstd::ActorId;
use sails_rs::prelude::*;

pub struct RadarCoreProgram;

#[program]
impl RadarCoreProgram {
    pub fn new() -> Self {
        Self
    }

    #[export]


    pub fn core(&self) -> RadarCoreService {
        RadarCoreService
    }
}

struct CoreState {
    owner: ActorId,
    broadcast_agent: Option<ActorId>,
    market_agent: Option<ActorId>,
    next_signal_id: u64,
    profiles: BTreeMap<AgentId, AgentProfile>,
    signals: Vec<InteractionSignal>,
    reputation: BTreeMap<AgentId, ReputationScore>,
    clusters: BTreeMap<u32, DemandCluster>,
    leaderboard: Vec<LeaderboardEntry>,
    opportunities: Vec<Opportunity>,
    premium_signals: Vec<PremiumSignal>,
    queued_cross_agent_calls: Vec<(RadarAgentKind, RadarAgentKind, String)>,
}

impl Default for CoreState {
    fn default() -> Self {
        Self {
            owner: ActorId::zero(),
            broadcast_agent: None,
            market_agent: None,
            next_signal_id: 0,
            profiles: BTreeMap::new(),
            signals: Vec::new(),
            reputation: BTreeMap::new(),
            clusters: BTreeMap::new(),
            leaderboard: Vec::new(),
            opportunities: Vec::new(),
            premium_signals: Vec::new(),
            queued_cross_agent_calls: Vec::new(),
        }
    }
}

static mut STATE: Option<CoreState> = None;

pub struct RadarCoreService;

#[service(events = RadarEvent)]
impl RadarCoreService {
    #[export]

    pub fn configure_agents(&mut self, broadcast_agent: ActorId, market_agent: ActorId) -> Result<(), RadarError> {
        let state = state_mut();
        if state.owner != ActorId::zero() && state.owner != caller() {
            return Err(RadarError::NotAuthorized);
        }
        state.owner = caller();
        state.broadcast_agent = Some(broadcast_agent);
        state.market_agent = Some(market_agent);
        Ok(())
    }

    #[export]


    pub fn register_profile(&mut self, mut profile: AgentProfile) -> Result<(), RadarError> {
        profile.agent = caller();
        profile.last_seen_ms = now();
        let state = state_mut();
        state.profiles.insert(profile.agent, profile.clone());
        state.reputation.entry(profile.agent).or_insert(default_reputation(profile.agent));
        let event = RadarEvent::AgentObserved(profile);
        self.emit_event(event).ok();
        Ok(())
    }

    #[export]


    pub fn ingest_event(
        &mut self,
        kind: SignalKind,
        target: Option<AgentId>,
        category: ServiceCategory,
        value: Option<Money>,
        weight: u32,
        metadata: String,
    ) -> Result<(), RadarError> {
        if weight == 0 || metadata.is_empty() {
            return Err(RadarError::BadInput);
        }
        let state = state_mut();
        state.next_signal_id += 1;
        let signal = InteractionSignal {
            id: state.next_signal_id,
            kind,
            source: caller(),
            target,
            category,
            value,
            weight,
            metadata,
            observed_at_ms: now(),
        };
        state.signals.push(signal.clone());
        update_reputation(&signal);
        update_cluster(&signal);
        recompute_leaderboard();
        refresh_opportunities();
        refresh_premium_signals();

        let event = RadarEvent::SignalIngested(signal);
        self.emit_event(event).ok();
        Ok(())
    }

    #[export]


    pub fn ranking(&self, limit: u32) -> Vec<LeaderboardEntry> {
        let mut rows = state_ref().leaderboard.clone();
        rows.truncate(limit as usize);
        rows
    }

    #[export]


    pub fn reputation_score(&self, agent: AgentId) -> Option<ReputationScore> {
        state_ref().reputation.get(&agent).cloned()
    }

    #[export]


    pub fn demand_signals(&self, limit: u32) -> Vec<DemandCluster> {
        let mut rows = state_ref().clusters.values().cloned().collect::<Vec<_>>();
        rows.sort_by(|a, b| b.demand_score.cmp(&a.demand_score));
        rows.truncate(limit as usize);
        rows
    }

    #[export]


    pub fn integration_suggestions(&self, requester: AgentId, limit: u32) -> Vec<IntegrationSuggestion> {
        let state = state_ref();
        let mut suggestions = state
            .leaderboard
            .iter()
            .filter(|entry| entry.agent != requester)
            .take(limit as usize)
            .map(|entry| IntegrationSuggestion {
                requester,
                provider: entry.agent,
                category: state
                    .profiles
                    .get(&entry.agent)
                    .and_then(|profile| profile.categories.first().cloned())
                    .unwrap_or(ServiceCategory::Analytics),
                confidence: entry.score.min(1000),
                reason: String::from("High score from real calls, counterparties, reputation, and recent activity."),
            })
            .collect::<Vec<_>>();
        suggestions.sort_by(|a, b| b.confidence.cmp(&a.confidence));
        suggestions
    }

    #[export]


    pub fn discover_providers(&self, query: ProviderQuery) -> Vec<ProviderMatch> {
        self.integration_suggestions(query.requester, 5)
            .into_iter()
            .filter(|suggestion| suggestion.category == query.category)
            .map(|suggestion| {
                let rep = state_ref().reputation.get(&suggestion.provider).cloned().unwrap_or(default_reputation(suggestion.provider));
                let handle = state_ref()
                    .profiles
                    .get(&suggestion.provider)
                    .map(|profile| profile.handle.clone())
                    .unwrap_or(String::from("@unknown"));
                ProviderMatch {
                    provider: suggestion.provider,
                    handle,
                    category: suggestion.category,
                    match_score: suggestion.confidence,
                    reputation_score: rep.trust_score,
                    estimated_fee: Some(Money::vara(CENTS_VARA_MICRO_PRICE)),
                    reason: suggestion.reason,
                }
            })
            .collect()
    }

    #[export]


    pub fn ecosystem_report(&self) -> EcosystemReport {
        EcosystemReport {
            title: String::from("A2A Radar Ecosystem Pulse"),
            summary: String::from("Live rankings, demand signals, opportunities, and integration suggestions from Radar Core."),
            top_agents: self.ranking(5),
            hot_clusters: self.demand_signals(5),
            opportunities: state_ref().opportunities.iter().cloned().take(5).collect(),
            created_at_ms: now(),
        }
    }

    #[export]


    pub fn premium_signals_for_market(&mut self, limit: u32) -> Result<Vec<PremiumSignal>, RadarError> {
        state_mut().queued_cross_agent_calls.push((
            RadarAgentKind::Core,
            RadarAgentKind::Market,
            String::from("Package high-value signals into paid feeds"),
        ));
        let event = RadarEvent::CrossAgentCallQueued {
            from: RadarAgentKind::Core,
            to: RadarAgentKind::Market,
            purpose: String::from("premium_signals_for_market"),
        };
        self.emit_event(event).ok();
        let mut rows = state_ref().premium_signals.clone();
        rows.truncate(limit as usize);
        Ok(rows)
    }

    #[export]


    pub fn report_for_broadcast(&mut self) -> Result<EcosystemReport, RadarError> {
        state_mut().queued_cross_agent_calls.push((
            RadarAgentKind::Core,
            RadarAgentKind::Broadcast,
            String::from("Publish ecosystem report to Board"),
        ));
        let report = self.ecosystem_report();
        let event = RadarEvent::EcosystemReportPublished(report.clone());
        self.emit_event(event).ok();
        Ok(report)
    }

    #[export]


    pub fn cached_counts(&self) -> (u32, u32, u32, u32) {
        let state = state_ref();
        (
            state.profiles.len() as u32,
            state.signals.len() as u32,
            state.leaderboard.len() as u32,
            state.opportunities.len() as u32,
        )
    }
}

fn state_mut() -> &'static mut CoreState {
    unsafe {
        if STATE.is_none() {
            STATE = Some(CoreState::default());
        }
        STATE.as_mut().expect("state exists")
    }
}

fn state_ref() -> &'static CoreState {
    unsafe {
        STATE.as_ref().expect("state exists")
    }
}

fn caller() -> ActorId {
    gstd::msg::source()
}

fn now() -> TimestampMs {
    gstd::exec::block_timestamp()
}

fn default_reputation(agent: AgentId) -> ReputationScore {
    ReputationScore {
        agent,
        trust_score: 500,
        reliability_score: 500,
        spam_risk: 100,
        successful_interactions: 0,
        unique_counterparties: 0,
        updated_at_ms: now(),
    }
}

fn update_reputation(signal: &InteractionSignal) {
    let state = state_mut();
    for agent in [Some(signal.source), signal.target].into_iter().flatten() {
        let row = state.reputation.entry(agent).or_insert(default_reputation(agent));
        row.successful_interactions = row.successful_interactions.saturating_add(1);
        row.trust_score = row.trust_score.saturating_add(signal.weight * 4).min(1000);
        row.reliability_score = row.reliability_score.saturating_add(signal.weight * 3).min(1000);
        row.spam_risk = row.spam_risk.saturating_sub(1);
        row.updated_at_ms = now();
    }
}

fn update_cluster(signal: &InteractionSignal) {
    let sector = sector_for(&signal.category);
    let state = state_mut();
    let cluster = state.clusters.entry(sector).or_insert(DemandCluster {
        sector,
        label: label_for(&signal.category),
        category: signal.category.clone(),
        demand_score: 0,
        supply_score: 0,
        growth_bps: 0,
        sample_size: 0,
        updated_at_ms: now(),
    });
    cluster.sample_size += 1;
    if matches!(signal.kind, SignalKind::Registration | SignalKind::ProviderResponse) {
        cluster.supply_score = cluster.supply_score.saturating_add(signal.weight);
    } else {
        cluster.demand_score = cluster.demand_score.saturating_add(signal.weight);
    }
    cluster.growth_bps = (cluster.demand_score as i32 - cluster.supply_score as i32) * 100;
    cluster.updated_at_ms = now();
}

fn recompute_leaderboard() {
    let state = state_mut();
    let mut rows = Vec::new();
    for (agent, profile) in &state.profiles {
        let incoming_calls = state.signals.iter().filter(|signal| signal.target == Some(*agent)).count() as u32;
        let outgoing_calls = state.signals.iter().filter(|signal| signal.source == *agent).count() as u32;
        let related = state
            .signals
            .iter()
            .filter(|signal| signal.source == *agent || signal.target == Some(*agent))
            .collect::<Vec<_>>();
        let mut counterparties = Vec::new();
        for signal in &related {
            let counterparty = if signal.source == *agent { signal.target } else { Some(signal.source) };
            if let Some(counterparty) = counterparty {
                if !counterparties.contains(&counterparty) {
                    counterparties.push(counterparty);
                }
            }
        }
        let unique_counterparties = counterparties.len() as u32;
        let repeat_counterparties = related.len().saturating_sub(unique_counterparties as usize) as u32;
        let payment_volume = related.iter().filter_map(|signal| signal.value.as_ref().map(|m| m.amount)).sum();
        let board_activity = related.iter().filter(|signal| matches!(signal.kind, SignalKind::BoardPost | SignalKind::ChatPost)).count() as u32;
        let integration_depth = unique_counterparties * 25 + repeat_counterparties * 5;
        let reputation = state.reputation.get(agent).map(|row| row.trust_score).unwrap_or(500);
        let score = incoming_calls * 20
            + outgoing_calls * 14
            + unique_counterparties * 50
            + repeat_counterparties * 10
            + board_activity * 8
            + integration_depth
            + reputation;
        rows.push(LeaderboardEntry {
            agent: *agent,
            handle: profile.handle.clone(),
            rank: 0,
            score,
            incoming_calls,
            outgoing_calls,
            unique_counterparties,
            repeat_counterparties,
            payment_volume,
            board_activity,
            integration_depth,
            sustained_activity: 1,
        });
    }
    rows.sort_by(|a, b| b.score.cmp(&a.score));
    for (index, row) in rows.iter_mut().enumerate() {
        row.rank = index as u32 + 1;
    }
    state.leaderboard = rows;
}

fn refresh_opportunities() {
    let state = state_mut();
    let mut clusters = state.clusters.values().cloned().collect::<Vec<_>>();
    clusters.sort_by(|a, b| b.demand_score.cmp(&a.demand_score));
    state.opportunities = clusters
        .into_iter()
        .take(5)
        .enumerate()
        .map(|(idx, cluster)| Opportunity {
            id: idx as u64 + 1,
            title: cluster.label.clone(),
            category: cluster.category,
            demand_score: cluster.demand_score,
            suggested_providers: state.leaderboard.iter().take(3).map(|entry| entry.agent).collect(),
            expected_value: Some(Money::vara(CENTS_VARA_MICRO_PRICE)),
            expires_at_ms: now().saturating_add(86_400_000),
        })
        .collect();
}

fn refresh_premium_signals() {
    let state = state_mut();
    state.premium_signals = state
        .opportunities
        .iter()
        .take(5)
        .map(|opportunity| PremiumSignal {
            id: opportunity.id,
            title: opportunity.title.clone(),
            category: opportunity.category.clone(),
            confidence: opportunity.demand_score.min(1000),
            price: Money::vara(CENTS_VARA_MICRO_PRICE),
            summary: String::from("Paid high-confidence opportunity generated from live Radar Core signals."),
        })
        .collect();
}

fn sector_for(category: &ServiceCategory) -> u32 {
    match category {
        ServiceCategory::Oracle => 1,
        ServiceCategory::Prediction => 2,
        ServiceCategory::Casino => 3,
        ServiceCategory::Analytics => 4,
        ServiceCategory::Social => 5,
        ServiceCategory::Marketplace => 6,
        ServiceCategory::Reputation => 7,
        ServiceCategory::Dao => 8,
        ServiceCategory::Registry => 9,
        ServiceCategory::Tooling => 10,
        ServiceCategory::Other(_) => 99,
    }
}

fn label_for(category: &ServiceCategory) -> String {
    match category {
        ServiceCategory::Oracle => String::from("Oracle demand"),
        ServiceCategory::Prediction => String::from("Prediction market demand"),
        ServiceCategory::Casino => String::from("Casino and randomness demand"),
        ServiceCategory::Analytics => String::from("Analytics demand"),
        ServiceCategory::Social => String::from("Social coordination demand"),
        ServiceCategory::Marketplace => String::from("Marketplace demand"),
        ServiceCategory::Reputation => String::from("Reputation demand"),
        ServiceCategory::Dao => String::from("DAO demand"),
        ServiceCategory::Registry => String::from("Registry demand"),
        ServiceCategory::Tooling => String::from("Tooling demand"),
        ServiceCategory::Other(label) => label.clone(),
    }
}
