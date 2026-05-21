#![no_std]
#![allow(static_mut_refs)]

extern crate alloc;

use alloc::{collections::BTreeMap, string::String, vec::Vec};
use a2a_radar_types::{
    AgentId, FeedTopic, IntegrationSuggestion, MarketProduct, Money, PremiumSignal, RadarAgentKind,
    RadarError, RadarEvent, ReferralRoute, ServiceCategory, Subscription, SubscriptionTier,
    TimestampMs, CENTS_VARA_MICRO_PRICE, PRO_PRICE_PER_PERIOD, PULSE_PRICE_PER_PERIOD,
};
use gstd::ActorId;
use sails_rs::prelude::*;

pub struct RadarMarketProgram;

#[program]
impl RadarMarketProgram {
    #[export]

    pub fn new() -> Self {
        unsafe {
            STATE = Some(MarketState::default());
        }
        Self
    }

    #[export]


    pub fn market(&self) -> RadarMarketService {
        RadarMarketService
    }
}

#[derive(Default)]
struct MarketState {
    owner: ActorId,
    core_agent: Option<ActorId>,
    next_product_id: u64,
    next_subscription_id: u64,
    next_referral_id: u64,
    products: Vec<MarketProduct>,
    premium_signals: Vec<PremiumSignal>,
    subscriptions: BTreeMap<u64, Subscription>,
    referrals: BTreeMap<u64, ReferralRoute>,
    treasury: Vec<(AgentId, Money, String, TimestampMs)>,
}

static mut STATE: Option<MarketState> = None;

pub struct RadarMarketService;

#[service(events = RadarEvent)]
impl RadarMarketService {
    #[export]

    pub fn configure(&mut self, core_agent: ActorId) -> Result<(), RadarError> {
        let state = state_mut();
        if state.owner != ActorId::zero() && state.owner != caller() {
            return Err(RadarError::NotAuthorized);
        }
        state.owner = caller();
        state.core_agent = Some(core_agent);
        seed_products();
        Ok(())
    }

    #[export]


    pub fn package_core_signals(&mut self, signals: Vec<PremiumSignal>) -> Result<RadarEvent, RadarError> {
        if signals.is_empty() {
            return Err(RadarError::BadInput);
        }
        let first = signals[0].clone();
        state_mut().premium_signals = signals;
        let event = RadarEvent::PremiumSignalPackaged(first);
        self.emit_event(RadarEvent::CrossAgentCallQueued {
            from: RadarAgentKind::Market,
            to: RadarAgentKind::Core,
            purpose: String::from("package_core_signals"),
        })
        .ok();
        self.emit_event(event.clone()).ok();
        Ok(event)
    }

    #[export]


    pub fn open_subscription(&mut self, tier: SubscriptionTier, topics: Vec<FeedTopic>, periods: u32) -> Result<RadarEvent, RadarError> {
        if periods == 0 {
            return Err(RadarError::BadInput);
        }
        let price = price_for(&tier);
        require_payment(&price)?;
        record_payment(caller(), price.clone(), String::from("subscription"));
        let state = state_mut();
        state.next_subscription_id += 1;
        let subscription = Subscription {
            id: state.next_subscription_id,
            subscriber: caller(),
            tier,
            topics,
            price_per_period: price,
            active_until_ms: now().saturating_add(periods as u64 * 86_400_000),
        };
        state.subscriptions.insert(subscription.id, subscription.clone());
        let event = RadarEvent::SubscriptionOpened(subscription);
        self.emit_event(event.clone()).ok();
        Ok(event)
    }

    #[export]


    pub fn buy_premium_signal(&mut self, signal_id: u64) -> Result<PremiumSignal, RadarError> {
        let signal = state_ref()
            .premium_signals
            .iter()
            .find(|signal| signal.id == signal_id)
            .cloned()
            .ok_or(RadarError::NotFound)?;
        require_payment(&signal.price)?;
        record_payment(caller(), signal.price.clone(), String::from("premium_signal"));
        let event = RadarEvent::PaymentCaptured {
            payer: caller(),
            amount: signal.price.clone(),
            purpose: String::from("premium_signal"),
        };
        self.emit_event(event).ok();
        Ok(signal)
    }

    #[export]


    pub fn paid_integration_recommendation(
        &mut self,
        provider: AgentId,
        category: ServiceCategory,
        reason: String,
    ) -> Result<IntegrationSuggestion, RadarError> {
        if reason.is_empty() {
            return Err(RadarError::BadInput);
        }
        let price = Money::vara(CENTS_VARA_MICRO_PRICE);
        require_payment(&price)?;
        record_payment(caller(), price, String::from("integration_recommendation"));
        Ok(IntegrationSuggestion {
            requester: caller(),
            provider,
            category,
            confidence: 750,
            reason,
        })
    }

    #[export]


    pub fn open_referral(&mut self, provider: AgentId, category: ServiceCategory, referral_fee_bps: u16) -> Result<RadarEvent, RadarError> {
        if referral_fee_bps > 2_000 {
            return Err(RadarError::BadInput);
        }
        let state = state_mut();
        state.next_referral_id += 1;
        let route = ReferralRoute {
            id: state.next_referral_id,
            requester: caller(),
            provider,
            category,
            referral_fee_bps,
            status: String::from("opened"),
        };
        state.referrals.insert(route.id, route.clone());
        let event = RadarEvent::ReferralOpened(route);
        self.emit_event(event.clone()).ok();
        Ok(event)
    }

    #[export]


    pub fn products(&self) -> Vec<MarketProduct> {
        state_ref().products.clone()
    }

    #[export]


    pub fn treasury_total(&self) -> u128 {
        state_ref().treasury.iter().map(|row| row.1.amount).sum()
    }

    #[export]


    pub fn my_subscriptions(&self) -> Vec<Subscription> {
        let me = caller();
        state_ref().subscriptions.values().filter(|sub| sub.subscriber == me).cloned().collect()
    }
}

fn state_mut() -> &'static mut MarketState {
    unsafe {
        if STATE.is_none() {
            STATE = Some(MarketState::default());
        }
        STATE.as_mut().expect("state exists")
    }
}

fn state_ref() -> &'static MarketState {
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

fn price_for(tier: &SubscriptionTier) -> Money {
    match tier {
        SubscriptionTier::Free => Money::vara(0),
        SubscriptionTier::Pulse => Money::vara(PULSE_PRICE_PER_PERIOD),
        SubscriptionTier::Pro => Money::vara(PRO_PRICE_PER_PERIOD),
        SubscriptionTier::Sponsor => Money::vara(PRO_PRICE_PER_PERIOD.saturating_mul(3)),
    }
}

fn seed_products() {
    let state = state_mut();
    if !state.products.is_empty() {
        return;
    }
    for (name, topic, price) in [
        (String::from("Pulse demand feed"), FeedTopic::DemandSpikes, Money::vara(PULSE_PRICE_PER_PERIOD)),
        (String::from("Provider discovery feed"), FeedTopic::ProviderDiscovery, Money::vara(CENTS_VARA_MICRO_PRICE)),
        (String::from("Integration recommendations"), FeedTopic::IntegrationOpportunities, Money::vara(PRO_PRICE_PER_PERIOD)),
    ] {
        state.next_product_id += 1;
        state.products.push(MarketProduct {
            id: state.next_product_id,
            name,
            topic,
            price,
            active: true,
        });
    }
}

fn record_payment(payer: AgentId, amount: Money, purpose: String) {
    state_mut().treasury.push((payer, amount, purpose, now()));
}

fn require_payment(price: &Money) -> Result<(), RadarError> {
    if price.amount == 0 {
        return Ok(());
    }
    if gstd::exec::value_available() < price.amount {
        return Err(RadarError::InvalidPayment);
    }
    Ok(())
}
