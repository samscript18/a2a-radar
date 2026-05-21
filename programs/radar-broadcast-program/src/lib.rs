#![no_std]
#![allow(static_mut_refs)]

extern crate alloc;

use alloc::{string::String, vec::Vec};
use a2a_radar_types::{
    BroadcastMessage, EcosystemReport, FeedTopic, InteractionSignal, Priority, RadarAgentKind,
    RadarError, RadarEvent, ServiceCategory, SignalKind, TimestampMs,
};
use gstd::ActorId;
use sails_rs::prelude::*;

pub struct RadarBroadcastProgram;

#[program]
impl RadarBroadcastProgram {
    #[export]

    pub fn new() -> Self {
        unsafe {
            STATE = Some(BroadcastState::default());
        }
        Self
    }

    #[export]


    pub fn broadcast(&self) -> RadarBroadcastService {
        RadarBroadcastService
    }
}

#[derive(Default)]
struct BroadcastState {
    owner: ActorId,
    core_agent: Option<ActorId>,
    board_agent: Option<ActorId>,
    chat_agent: Option<ActorId>,
    messages: Vec<BroadcastMessage>,
    demand_feedback: Vec<InteractionSignal>,
    sequence: u64,
}

static mut STATE: Option<BroadcastState> = None;

pub struct RadarBroadcastService;

#[service(events = RadarEvent)]
impl RadarBroadcastService {
    #[export]

    pub fn configure(&mut self, core_agent: ActorId, board_agent: ActorId, chat_agent: ActorId) -> Result<(), RadarError> {
        let state = state_mut();
        if state.owner != ActorId::zero() && state.owner != caller() {
            return Err(RadarError::NotAuthorized);
        }
        state.owner = caller();
        state.core_agent = Some(core_agent);
        state.board_agent = Some(board_agent);
        state.chat_agent = Some(chat_agent);
        Ok(())
    }

    #[export]


    pub fn consume_core_report(&mut self, report: EcosystemReport) -> Result<RadarEvent, RadarError> {
        let message = format_report(&report);
        state_mut().messages.push(message.clone());
        let event = RadarEvent::BoardMessageQueued {
            topic: message.topic,
            body: message.body,
        };
        self.emit_event(RadarEvent::CrossAgentCallQueued {
            from: RadarAgentKind::Broadcast,
            to: RadarAgentKind::Core,
            purpose: String::from("consumed_core_report"),
        })
        .ok();
        self.emit_event(event.clone()).ok();
        Ok(event)
    }

    #[export]


    pub fn publish_trend_summary(&mut self) -> Result<RadarEvent, RadarError> {
        let state = state_mut();
        let latest = state.messages.last().cloned().unwrap_or(BroadcastMessage {
            title: String::from("A2A Radar ecosystem pulse"),
            body: String::from("Radar Broadcast is live. Waiting for Core rankings and live demand signals."),
            topic: FeedTopic::EcosystemPulse,
            source_report: None,
            created_at_ms: now(),
        });
        let event = RadarEvent::BoardMessageQueued {
            topic: latest.topic,
            body: latest.body,
        };
        self.emit_event(event.clone()).ok();
        Ok(event)
    }

    #[export]


    pub fn announce_integration(&mut self, provider: ActorId, summary: String) -> Result<RadarEvent, RadarError> {
        if summary.is_empty() {
            return Err(RadarError::BadInput);
        }
        let body = String::from("A2A Radar integration: provider matched and ready for calls.");
        let event = RadarEvent::IntegrationRecommended {
            requester: caller(),
            provider,
            reason: summary,
        };
        state_mut().messages.push(BroadcastMessage {
            title: String::from("Integration announcement"),
            body,
            topic: FeedTopic::IntegrationOpportunities,
            source_report: None,
            created_at_ms: now(),
        });
        self.emit_event(event.clone()).ok();
        Ok(event)
    }

    #[export]


    pub fn trigger_demand_feedback(
        &mut self,
        category: ServiceCategory,
        weight: u32,
        note: String,
    ) -> Result<RadarEvent, RadarError> {
        if weight == 0 || note.is_empty() {
            return Err(RadarError::BadInput);
        }
        let state = state_mut();
        state.sequence += 1;
        let signal = InteractionSignal {
            id: state.sequence,
            kind: SignalKind::DemandRequest,
            source: caller(),
            target: state.core_agent,
            category,
            value: None,
            weight,
            metadata: note,
            observed_at_ms: now(),
        };
        state.demand_feedback.push(signal.clone());
        let event = RadarEvent::SignalIngested(signal);
        self.emit_event(RadarEvent::CrossAgentCallQueued {
            from: RadarAgentKind::Broadcast,
            to: RadarAgentKind::Core,
            purpose: String::from("demand_feedback"),
        })
        .ok();
        self.emit_event(event.clone()).ok();
        Ok(event)
    }

    #[export]


    pub fn pending_board_messages(&self) -> Vec<BroadcastMessage> {
        state_ref().messages.clone()
    }

    #[export]


    pub fn next_chat_alert(&self) -> Option<String> {
        state_ref().messages.last().map(|message| message.body.clone())
    }

    #[export]


    pub fn queue_chat_alert(&mut self, body: String) -> Result<RadarEvent, RadarError> {
        if body.is_empty() {
            return Err(RadarError::BadInput);
        }
        let event = RadarEvent::ChatMessageQueued {
            priority: Priority::High,
            body,
        };
        self.emit_event(event.clone()).ok();
        Ok(event)
    }
}

fn state_mut() -> &'static mut BroadcastState {
    unsafe {
        if STATE.is_none() {
            STATE = Some(BroadcastState::default());
        }
        STATE.as_mut().expect("state exists")
    }
}

fn state_ref() -> &'static BroadcastState {
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

fn format_report(report: &EcosystemReport) -> BroadcastMessage {
    let top = report.top_agents.first().map(|entry| entry.handle.clone()).unwrap_or(String::from("none yet"));
    let hot = report.hot_clusters.first().map(|cluster| cluster.label.clone()).unwrap_or(String::from("no cluster"));
    BroadcastMessage {
        title: String::from("A2A Radar ecosystem pulse"),
        body: {
            let mut body = String::from("A2A Radar: top agent ");
            body.push_str(&top);
            body.push_str("; hottest demand ");
            body.push_str(&hot);
            body.push_str(". Call Radar Core for rankings, reputation, and integration suggestions.");
            body
        },
        topic: FeedTopic::EcosystemPulse,
        source_report: Some(report.clone()),
        created_at_ms: now(),
    }
}
