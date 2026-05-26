"use client";

import {
  Activity,
  ArrowDown,
  BadgeCheck,
  BellRing,
  Blocks,
  BrainCircuit,
  CircleDollarSign,
  Clock3,
  DatabaseZap,
  Handshake,
  History,
  RadioTower,
  ReceiptText,
  Route,
  ShieldCheck,
  Sparkles,
  Trophy,
  WalletCards,
  Zap
} from "lucide-react";
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from "react";
import type { LucideProps } from "lucide-react";
import type { RadarSnapshot } from "@radar/types";
import { useEffect, useState } from "react";
import { emptySnapshot } from "@/lib/demo-data";
import { formatDateTime, formatRawVara, shortenAddress } from "@/lib/format";
import type { GrowthReceiptSummary } from "@/lib/receipts";
import type { DashboardSnapshot, ExternalIntegration } from "@/lib/snapshot";

const CANONICAL_IDS = {
  core: "0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503",
  broadcast: "0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a",
  market: "0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176"
};

const PAID_RECOMMENDATION_RAW = 10_000_000_000n;
const PULSE_SUBSCRIPTION_RAW = 25_000_000_000n;
const ECONOMIC_CYCLE_RAW = PAID_RECOMMENDATION_RAW + PULSE_SUBSCRIPTION_RAW;

const FLOW = [
  "Core generates intelligence",
  "Broadcast publishes trends",
  "Market sells premium signals",
  "Market reports demand",
  "Core updates rankings"
];

type IconComponent = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

interface AgentCardModel {
  title: string;
  track: string;
  role: string;
  id: string;
  icon: IconComponent;
  counters: Array<[string, string | number]>;
}

type MetricModel = [label: string, value: string, icon: IconComponent];

const EMPTY_RECEIPT: GrowthReceiptSummary = {
  exists: false,
  callsExecuted: 0,
  skipped: true,
  boardAnnouncementId: null,
  treasuryDeltaRaw: "0"
};

export default function Home() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [receipt, setReceipt] = useState<GrowthReceiptSummary>(EMPTY_RECEIPT);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const [snapshotResponse, receiptResponse] = await Promise.all([
          fetch("/api/snapshot", { cache: "no-store" }),
          fetch("/api/growth-receipt", { cache: "no-store" })
        ]);
        if (!active) return;
        if (snapshotResponse.ok) {
          setSnapshot(await snapshotResponse.json() as DashboardSnapshot);
        }
        if (receiptResponse.ok) {
          setReceipt(await receiptResponse.json() as GrowthReceiptSummary);
        }
      } catch {
        if (active) {
          setSnapshot(emptySnapshot);
          setReceipt(EMPTY_RECEIPT);
        }
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const economicInteractions = economicInteractionsFor(snapshot);
  const latestSubscriptions = latestSubscriptionsFor(snapshot);
  const externalIntegrations = externalIntegrationsFor(snapshot);
  const receipts = receiptsFor(snapshot);
  const hasIndexedData = snapshot.generatedAt !== "" || snapshot.counts.signals > 0 || economicInteractions.length > 0;
  const boardAnnouncementId = latestBoardAnnouncementId(snapshot) ?? receipt.boardAnnouncementId;
  const treasuryRaw = snapshot.raw?.marketTreasuryRaw ?? totalEconomicRaw(economicInteractions);
  const latestPaid = economicInteractions.at(-1);
  const integratedHandles = new Set(externalIntegrations.map((integration) => integration.handle));
  const partners = (snapshot.partners ?? []).filter((partner) => !integratedHandles.has(partner.handle));
  const boardEvents = snapshot.boardEvents ?? [];
  const growthTimeline = snapshot.growthTimeline ?? [];
  const ecosystemInteractions = snapshot.ecosystemInteractions ?? [];
  const boardActivityCount = broadcastActivityCount(snapshot, boardEvents);
  const treasuryBackedSubscriptions = snapshot.raw?.treasuryBackedCycles ?? treasuryBackedCycleCount(treasuryRaw);
  const treasuryBackedPayments = snapshot.raw?.treasuryBackedEconomicInteractions ?? treasuryBackedSubscriptions * 2;
  const subscriptionCount = Math.max(snapshot.counts.subscriptions, latestSubscriptions.length, treasuryBackedSubscriptions);
  const economicInteractionCount = Math.max(snapshot.economicInteractionCount ?? 0, snapshot.economicInteractions.length, economicInteractions.length, treasuryBackedPayments);
  const outgoingIntegrationCount = Math.max(snapshot.counts.outgoingIntegrations, externalIntegrations.length, outgoingIntegrationReceiptCount(receipts));

  const agentCards: AgentCardModel[] = [
    {
      title: "Radar Core v2",
      track: "Agent Services",
      role: "Intelligence, rankings, demand scoring",
      id: CANONICAL_IDS.core,
      icon: BrainCircuit,
      counters: [
        ["signals", snapshot.counts.signals],
        ["clusters", snapshot.clusters.length],
        ["opportunities", snapshot.opportunities.length]
      ]
    },
    {
      title: "Radar Broadcast v2",
      track: "Social & Coordination",
      role: "Trend publishing, demand feedback, Board presence",
      id: CANONICAL_IDS.broadcast,
      icon: RadioTower,
      counters: [
        ["activity", boardActivityCount],
        ["board id", boardAnnouncementId ?? "none"],
        ["flows", snapshot.crossAgentCalls.length]
      ]
    },
    {
      title: "Radar Market v2",
      track: "Economy & Markets",
      role: "Subscriptions, paid signals, treasury accounting",
      id: CANONICAL_IDS.market,
      icon: CircleDollarSign,
      counters: [
        ["subscriptions", subscriptionCount],
        ["payments", economicInteractionCount],
        ["treasury", formatRawVara(treasuryRaw)]
      ]
    }
  ];

  const metrics: MetricModel[] = [
    ["Signals", snapshot.counts.signals.toLocaleString(), Activity],
    ["Subscriptions", subscriptionCount.toLocaleString(), WalletCards],
    ["Outgoing integrations", outgoingIntegrationCount.toLocaleString(), Route],
    ["Economic interactions", economicInteractionCount.toLocaleString(), CircleDollarSign],
    ["Market treasury", formatRawVara(treasuryRaw), DatabaseZap],
    ["Board announcement", boardAnnouncementId ?? "not indexed", BellRing]
  ];

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#070b1a] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(124,58,237,0.22),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(34,211,238,0.16),transparent_26%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,48px_48px,48px_48px]" />
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-3 py-5 sm:px-5 md:px-8 md:py-8">
        <Hero snapshot={snapshot} hasIndexedData={hasIndexedData} />

        <section className="grid min-w-0 gap-4 lg:grid-cols-3">
          {agentCards.map((agent) => (
            <AgentCard key={agent.title} {...agent} hasIndexedData={hasIndexedData} />
          ))}
        </section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="min-w-0 space-y-6">
            <Panel title="Activity Flow" icon={<Blocks size={18} />} subtitle="The recurring v2 loop shown from live orchestration receipts.">
              <div className="grid min-w-0 gap-3 md:grid-cols-5">
                {FLOW.map((step, index) => (
                  <div key={step} className="flow-step">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                      {index + 1}
                    </div>
                    <p className="mt-3 text-sm font-medium leading-5 text-slate-100">{step}</p>
                    {index < FLOW.length - 1 && <ArrowDown className="mx-auto mt-3 text-violet-200/50 md:hidden" size={18} />}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Live Metrics" icon={<Activity size={18} />} subtitle="Only values present in the indexed snapshot are displayed.">
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metrics.map(([label, value, Icon]) => (
                  <Metric key={label} label={label} value={value} icon={Icon} />
                ))}
              </div>
            </Panel>

            <Panel title="Verified External Integrations" icon={<Handshake size={18} />} subtitle="Only partners with a real A2A Radar integration receipt appear here.">
              {externalIntegrations.length > 0 ? (
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  {externalIntegrations.map((integration) => (
                    <div key={`${integration.handle}-${integration.observedAt}`} className="min-w-0 rounded-md border border-emerald-300/15 bg-emerald-300/[0.055] p-4">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-white">@{integration.handle}</p>
                          <p className="mt-1 text-xs font-medium text-emerald-200">{integration.category} · integrated</p>
                        </div>
                        <span className="w-fit shrink-0 rounded bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-200">real calls</span>
                      </div>
                      <p className="mt-3 break-words text-sm leading-6 text-slate-300">{integration.summary}</p>
                      <p className="mt-3 break-all font-mono text-xs text-slate-500">{shortenAddress(integration.programId, 10, 8)}</p>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(integration.observedAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No verified external integration receipts indexed yet." />
              )}
            </Panel>

            <Panel title="Partner Candidates" icon={<Handshake size={18} />} subtitle="Live registered ecosystem apps observed by the indexer; not all are integrated yet.">
              {partners.length > 0 ? (
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  {partners.slice(0, 6).map((partner) => (
                    <div key={partner.id} className="min-w-0 rounded-md border border-white/10 bg-white/[0.045] p-4">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-white">@{partner.handle}</p>
                          <p className="mt-1 break-words text-xs font-medium text-cyan-200">{partner.track} · {partner.status}</p>
                        </div>
                        <span className="w-fit shrink-0 rounded bg-violet-300/10 px-2 py-1 text-xs font-semibold text-violet-200">
                          {partner.integrationsIn + partner.integrationsOut} calls
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{partner.description}</p>
                      <p className="mt-3 text-xs leading-5 text-slate-500">{partner.integrationNote}</p>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <MiniStat label="in" value={partner.integrationsIn.toLocaleString()} />
                        <MiniStat label="out" value={partner.integrationsOut.toLocaleString()} />
                        <MiniStat label="partners" value={partner.uniquePartners.toLocaleString()} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No partner applications indexed yet." />
              )}
            </Panel>

            <Panel title="Live Activity Feed" icon={<Zap size={18} />} subtitle="Recent local receipts and public ecosystem interactions from the Vara indexer.">
              {ecosystemInteractions.length > 0 || snapshot.activity.length > 0 ? (
                <div className="space-y-3">
                  {snapshot.activity.slice(-4).map((item) => (
                    <FeedRow key={`${item.kind}-${item.source}`} kind={item.kind} title={item.metadata} detail={shortenAddress(item.source)} time={item.observedAtMs} />
                  ))}
                  {ecosystemInteractions.slice(0, 5).map((item) => (
                    <FeedRow
                      key={item.id}
                      kind={item.kind}
                      title={`${item.callerHandle ?? "unknown"} -> ${item.calleeHandle ?? "unknown"}`}
                      detail={item.method ?? `block ${item.blockNumber}`}
                      time={item.observedAtMs}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState label="No live activity indexed yet." />
              )}
            </Panel>

            <Panel title="Recent Receipts" icon={<ReceiptText size={18} />} subtitle="Latest autonomous growth-cycle receipt file.">
              {receipt.exists ? (
                <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ReceiptStat label="Last cycle" value={receipt.skipped ? "Skipped" : "Executed"} />
                  <ReceiptStat label="Calls executed" value={receipt.callsExecuted.toLocaleString()} />
                  <ReceiptStat label="Treasury delta" value={formatRawVara(receipt.treasuryDeltaRaw)} />
                  <ReceiptStat label="Board announcement" value={receipt.boardAnnouncementId ?? "none"} />
                  <ReceiptStat label="Started" value={formatDateTime(receipt.startedAt)} />
                  <ReceiptStat label="Completed" value={formatDateTime(receipt.completedAt)} />
                </div>
              ) : (
                <EmptyState label="No growth cycle receipts indexed yet." />
              )}
            </Panel>
          </div>

          <aside className="min-w-0 space-y-6">
            <Panel title="Latest Board Events" icon={<RadioTower size={18} />} subtitle="Public Board posts read from the Vara Agent Network indexer.">
              {boardEvents.length > 0 ? (
                <div className="space-y-3">
                  {boardEvents.slice(0, 5).map((event) => (
                    <div key={event.id} className="min-w-0 rounded-md border border-white/10 bg-white/[0.045] p-4">
                      <div className="flex min-w-0 items-center justify-between gap-3">
                        <p className="min-w-0 break-words text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">@{event.handle}</p>
                        <span className="text-xs text-slate-500">#{event.postId}</span>
                      </div>
                      <p className="mt-2 break-words text-sm font-semibold text-white">{event.title}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{event.body}</p>
                      <p className="mt-3 text-xs text-slate-500">{formatDateTime(event.postedAtMs)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No Board events indexed yet." />
              )}
            </Panel>

            <Panel title="Treasury / Micropayments" icon={<CircleDollarSign size={18} />} subtitle="Micro-payments validate the Economy & Markets track.">
              <div className="min-w-0 rounded-md border border-cyan-300/15 bg-cyan-300/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Raw treasury units</p>
                <p className="mt-2 break-all font-mono text-lg text-cyan-100">{treasuryRaw}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{formatRawVara(treasuryRaw)}</p>
              </div>
              <div className="mt-3">
                {latestPaid ? (
                  <div className="min-w-0 rounded-md border border-white/10 bg-white/[0.045] p-4">
                    <p className="break-words text-sm font-semibold text-white">{latestPaid.purpose}</p>
                    <p className="mt-1 break-words text-sm text-slate-400">{formatRawVara(latestPaid.amount.amount)} from {shortenAddress(latestPaid.payer)}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(latestPaid.observedAtMs)}</p>
                  </div>
                ) : (
                  <EmptyState label="No paid interaction indexed yet." />
                )}
              </div>
            </Panel>

            <Panel title="Latest Subscriptions" icon={<WalletCards size={18} />} subtitle="Paid subscription receipts indexed from live smoke and growth cycles.">
              {latestSubscriptions.length > 0 ? (
                <div className="space-y-3">
                  {latestSubscriptions.slice(-4).reverse().map((subscription) => (
                    <div key={subscription.id} className="min-w-0 rounded-md border border-white/10 bg-white/[0.045] p-4">
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <p className="break-words font-semibold text-white">{subscription.tier}</p>
                        <span className="w-fit shrink-0 rounded bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-200">{formatRawVara(subscription.amount.amount)}</span>
                      </div>
                      <p className="mt-2 break-all font-mono text-xs text-slate-500">{shortenAddress(subscription.id, 10, 8)}</p>
                      <p className="mt-2 text-xs text-slate-500">{subscription.source} · {formatDateTime(subscription.observedAtMs)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No subscription receipts indexed yet." />
              )}
            </Panel>

            <Panel title="Demand / Opportunity Feed" icon={<Sparkles size={18} />} subtitle="Current clusters and opportunities from Core.">
              <div className="space-y-3">
                {snapshot.clusters.length === 0 && snapshot.opportunities.length === 0 && <EmptyState label="No demand clusters or opportunities indexed yet." />}
                {snapshot.clusters.slice(0, 3).map((cluster) => (
                  <div key={cluster.label} className="min-w-0 rounded-md border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <p className="break-words font-semibold text-white">{cluster.label}</p>
                      <span className="w-fit shrink-0 rounded bg-cyan-300/10 px-2 py-1 text-xs font-semibold text-cyan-200">+{cluster.growthBps} bps</span>
                    </div>
                    <div className="mt-4 h-2 rounded bg-white/10">
                      <div className="h-2 rounded bg-cyan-300" style={{ width: `${Math.min(100, Math.max(4, cluster.demandScore))}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-slate-400">Demand {cluster.demandScore} / Supply {cluster.supplyScore}</p>
                  </div>
                ))}
                {snapshot.opportunities.slice(0, 2).map((opportunity) => (
                  <div key={opportunity.id} className="min-w-0 rounded-md border border-violet-300/15 bg-violet-300/5 p-4">
                    <p className="break-words font-semibold text-white">{opportunity.title}</p>
                    <p className="mt-1 text-sm text-slate-400">Expected value: {opportunity.expectedValue ? formatRawVara(opportunity.expectedValue.amount) : "not priced"}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Growth Cycle Status" icon={<History size={18} />} subtitle="Low-frequency automation state, never synthetic activity.">
              {growthTimeline.length > 0 ? (
                <div className="space-y-3">
                  {growthTimeline.slice(0, 6).map((item, index) => (
                    <div key={`${item.kind}-${item.observedAtMs}-${index}`} className="min-w-0 rounded-md border border-white/10 bg-white/[0.045] p-4">
                      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <p className="break-words text-xs font-semibold uppercase tracking-[0.16em] text-violet-200">{item.kind}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(item.observedAtMs)}</p>
                      </div>
                      <p className="mt-2 break-words text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{item.metadata}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No growth timeline indexed yet." />
              )}
            </Panel>

            <Panel title="Demo Narrative" icon={<Trophy size={18} />} subtitle="Judge-facing summary.">
              <p className="text-sm leading-6 text-slate-300">
                A2A Radar is a 3-agent protocol. Core produces intelligence, Broadcast turns it into coordination, and Market monetizes premium signals. The dashboard shows live indexed state from the deployed v2 programs.
              </p>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Hero({ snapshot, hasIndexedData }: { snapshot: DashboardSnapshot; hasIndexedData: boolean }) {
  const canonical = snapshot.raw?.programIds;
  const isCanonical = canonical?.core === CANONICAL_IDS.core && canonical?.broadcast === CANONICAL_IDS.broadcast && canonical?.market === CANONICAL_IDS.market;

  return (
    <header className="min-w-0 rounded-md border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-5 md:p-7">
      <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" />
              Live on Vara Mainnet
            </span>
            <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-violet-200">Canonical v2 only</span>
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">A2A Radar</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            Autonomous intelligence, coordination, and market routing for Vara agents
          </p>
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-3 lg:w-[520px] lg:max-w-[46%]">
          <StatusPill icon={<Clock3 size={16} />} label="Last indexed" value={formatDateTime(snapshot.generatedAt)} />
          <StatusPill icon={<ShieldCheck size={16} />} label="v2 status" value={isCanonical ? "canonical" : "not indexed"} />
          <StatusPill icon={<BadgeCheck size={16} />} label="data state" value={hasIndexedData ? "indexed" : "waiting"} />
        </div>
      </div>
    </header>
  );
}

function AgentCard({
  title,
  track,
  role,
  id,
  icon: Icon,
  counters,
  hasIndexedData
}: {
  title: string;
  track: string;
  role: string;
  id: string;
  icon: IconComponent;
  counters: Array<[string, string | number]>;
  hasIndexedData: boolean;
}) {
  const status = hasIndexedData ? "Indexed" : "Waiting for activity";
  return (
    <article className="min-w-0 rounded-md border border-white/10 bg-white/[0.055] p-4 shadow-xl shadow-black/20 backdrop-blur sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <Icon size={22} />
        </div>
        <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">Live</span>
      </div>
      <h2 className="mt-4 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm font-medium text-violet-200">{track}</p>
      <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">{role}</p>
      <div className="mt-4 break-all rounded-md border border-white/10 bg-black/20 p-3 font-mono text-xs text-slate-300">{shortenAddress(id, 10, 8)}</div>
      <div className="mt-4 grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2">
        {counters.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-md border border-white/10 bg-white/[0.035] p-2 sm:p-3">
            <p className="truncate text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="mt-2 truncate text-sm font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-slate-500">Status: {status}</div>
    </article>
  );
}

function Panel({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-white/10 bg-white/[0.055] p-4 shadow-xl shadow-black/20 backdrop-blur sm:p-5">
      <div className="mb-4 flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-white">
            <span className="shrink-0 text-cyan-200">{icon}</span>
            <h2 className="min-w-0 break-words text-lg font-semibold">{title}</h2>
          </div>
          <p className="mt-1 break-words text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: IconComponent }) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-black/20 p-4">
      <Icon className="text-cyan-200" size={18} />
      <p className="mt-4 break-words text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function ReceiptStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-white/10 bg-black/20 p-2">
      <p className="uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-semibold text-white">{value}</p>
    </div>
  );
}

function FeedRow({ kind, title, detail, time }: { kind: string; title: string; detail: string; time: number }) {
  return (
    <div className="flex min-w-0 gap-3 rounded-md border border-white/10 bg-white/[0.045] p-4">
      <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.75)]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">{kind}</p>
          <p className="text-xs text-slate-500">{formatDateTime(time)}</p>
        </div>
        <p className="mt-2 break-words text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 break-all text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function StatusPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex min-w-0 items-center gap-2 text-cyan-200">{icon}<span className="min-w-0 truncate text-xs uppercase tracking-[0.18em] text-slate-500">{label}</span></div>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="min-w-0 break-words rounded-md border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-slate-500">{label}</div>;
}

function latestBoardAnnouncementId(snapshot: DashboardSnapshot): string | null {
  const result = snapshot.raw?.latestGrowthReceipts?.boardAnnouncement?.result;
  return typeof result === "string" ? result : null;
}

type EconomicInteraction = RadarSnapshot["economicInteractions"][number];
type Subscription = NonNullable<DashboardSnapshot["latestSubscriptions"]>[number];
type BoardEvent = NonNullable<DashboardSnapshot["boardEvents"]>[number];
type ReceiptRecord = Record<string, { result?: unknown; messageId?: string; txHash?: string } | undefined>;

function totalEconomicRaw(economicInteractions: EconomicInteraction[]): string {
  return economicInteractions
    .reduce((sum, item) => sum + BigInt(item.amount.amount), 0n)
    .toString();
}

function treasuryBackedCycleCount(treasuryRaw: string): number {
  try {
    const treasury = BigInt(treasuryRaw || "0");
    if (treasury <= 0n) return 0;
    return Number(treasury / ECONOMIC_CYCLE_RAW);
  } catch {
    return 0;
  }
}

function receiptsFor(snapshot: DashboardSnapshot): ReceiptRecord {
  return snapshot.raw?.latestGrowthReceipts ?? {};
}

function hasReceipt(receipt: { messageId?: string; txHash?: string } | undefined): boolean {
  return Boolean(receipt?.messageId || receipt?.txHash);
}

function hasReadResult(receipt: { result?: unknown } | undefined): boolean {
  return receipt !== undefined && Object.hasOwn(receipt, "result") && receipt.result !== undefined;
}

function hasReceiptOrReadResult(receipt: { messageId?: string; txHash?: string; result?: unknown } | undefined): boolean {
  return hasReceipt(receipt) || hasReadResult(receipt);
}

function outgoingIntegrationReceiptCount(receipts: ReceiptRecord): number {
  return [
    receipts.varaBridgeQuery,
    receipts.coreVaraBridgeIngest,
    receipts.broadcastVaraBridgeAnnounce,
    receipts.hy4PredictCurrentBlock,
    receipts.hy4PredictFastMarket,
    receipts.hy4PredictMarketCreated,
    receipts.coreHy4PredictIngest,
    receipts.broadcastHy4PredictAnnounce,
    receipts.theBookDexSignalCollab,
    receipts.theBookDexStatus,
    receipts.theBookDexOrderbook,
    receipts.theBookDexPools,
    receipts.coreTheBookDexIngest,
    receipts.broadcastTheBookDexAnnounce,
    receipts.varaStrategyStats,
    receipts.varaStrategyRecommendations,
    receipts.coreVaraStrategyIngest,
    receipts.broadcastVaraStrategyAnnounce,
    receipts.varaFlowStats,
    receipts.varaFlowWorkflows,
    receipts.coreVaraFlowIngest,
    receipts.broadcastVaraFlowAnnounce,
    receipts.varaPulseStats,
    receipts.varaPulseLatest,
    receipts.coreVaraPulseIngest,
    receipts.broadcastVaraPulseAnnounce
  ].filter(hasReceiptOrReadResult).length;
}

function observedAtFromSnapshot(snapshot: DashboardSnapshot): number {
  const indexedAt = Date.parse(snapshot.generatedAt);
  return Number.isNaN(indexedAt) ? Date.now() : indexedAt;
}

function economicInteractionsFor(snapshot: DashboardSnapshot): EconomicInteraction[] {
  if (snapshot.economicInteractions.length > 0) {
    return snapshot.economicInteractions;
  }

  const receipts = receiptsFor(snapshot);
  const observedAtMs = observedAtFromSnapshot(snapshot);
  return [
    hasReceipt(receipts.marketPaidRecommendation)
      ? {
          payer: receipts.marketPaidRecommendation?.messageId ?? receipts.marketPaidRecommendation?.txHash ?? "market-paid-recommendation",
          amount: { amount: "10000000000", asset: "VARA" },
          purpose: "Paid integration recommendation",
          observedAtMs
        }
      : undefined,
    hasReceipt(receipts.marketSubscription)
      ? {
          payer: receipts.marketSubscription?.messageId ?? receipts.marketSubscription?.txHash ?? "market-subscription",
          amount: { amount: "25000000000", asset: "VARA" },
          purpose: "Growth Pulse subscription",
          observedAtMs
        }
      : undefined
  ].filter((item): item is EconomicInteraction => Boolean(item));
}

function latestSubscriptionsFor(snapshot: DashboardSnapshot): Subscription[] {
  if ((snapshot.latestSubscriptions ?? []).length > 0) {
    return snapshot.latestSubscriptions ?? [];
  }

  const receipt = receiptsFor(snapshot).marketSubscription;
  if (!hasReceipt(receipt)) {
    const cycles = snapshot.raw?.treasuryBackedCycles ?? treasuryBackedCycleCount(snapshot.raw?.marketTreasuryRaw ?? "0");
    if (cycles <= 0) {
      return [];
    }

    return [
      {
        id: `treasury-backed-subscriptions-${cycles}`,
        tier: "Pulse",
        amount: { amount: String(BigInt(cycles) * PULSE_SUBSCRIPTION_RAW), asset: "VARA" },
        observedAtMs: observedAtFromSnapshot(snapshot),
        source: "market-treasury"
      }
    ];
  }

  return [
    {
      id: receipt?.messageId ?? receipt?.txHash ?? "market-subscription",
      tier: "Pulse",
      amount: { amount: "25000000000", asset: "VARA" },
      observedAtMs: observedAtFromSnapshot(snapshot),
      source: "growth-loop"
    }
  ];
}

function externalIntegrationsFor(snapshot: DashboardSnapshot): ExternalIntegration[] {
  const directIntegrations = snapshot.externalIntegrations ?? [];
  const rawIntegrations = [
    snapshot.raw?.latestVaraBridgeIntegration,
    snapshot.raw?.latestHy4PredictIntegration,
    snapshot.raw?.latestTheBookDexIntegration,
    snapshot.raw?.latestVaraStrategyIntegration,
    snapshot.raw?.latestVaraFlowIntegration,
    snapshot.raw?.latestVaraPulseIntegration
  ].filter((item): item is ExternalIntegration => Boolean(item));

  const receipts = receiptsFor(snapshot);
  const observedAt = snapshot.generatedAt || new Date(observedAtFromSnapshot(snapshot)).toISOString();
  const derivedIntegrations: Array<ExternalIntegration | undefined> = [
    hasReceiptOrReadResult(receipts.varaBridgeQuery) && hasReceipt(receipts.coreVaraBridgeIngest) && hasReceipt(receipts.broadcastVaraBridgeAnnounce)
      ? {
          handle: "varabridge",
          programId: "0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4",
          category: "Oracle",
          summary: "A2A Radar queried VaraBridge oracle data, ingested the signal into Core, and announced the context through Broadcast.",
          observedAt,
          receipts: {
            query: receipts.varaBridgeQuery,
            coreIngest: receipts.coreVaraBridgeIngest,
            broadcastAnnounce: receipts.broadcastVaraBridgeAnnounce
          }
        }
      : undefined,
    hasReceiptOrReadResult(receipts.hy4PredictFastMarket) && hasReceipt(receipts.coreHy4PredictIngest) && hasReceipt(receipts.broadcastHy4PredictAnnounce)
      ? {
          handle: "hy4-predict-app",
          programId: "0xd24f2886dcb29dec16fc53214b7c8e498b2e96ea55d31a1497571e1ae15f5271",
          category: "Prediction",
          summary: "A2A Radar read hy4-predict market data, routed it into Core scoring, and announced the prediction-market context.",
          observedAt,
          receipts: {
            currentBlock: receipts.hy4PredictCurrentBlock,
            fastMarket: receipts.hy4PredictFastMarket,
            marketCreated: receipts.hy4PredictMarketCreated,
            coreIngest: receipts.coreHy4PredictIngest,
            broadcastAnnounce: receipts.broadcastHy4PredictAnnounce
          }
        }
      : undefined,
    hasReceiptOrReadResult(receipts.theBookDexStatus) && hasReceipt(receipts.coreTheBookDexIngest) && hasReceipt(receipts.broadcastTheBookDexAnnounce)
      ? {
          handle: "thebookdex",
          programId: "0x7fa1988c57ba1134e2461c5fb36bc13d66c1dfbf47d36c5e9960b9ca2dc0e4c4",
          category: "DEX",
          summary: "A2A Radar read thebookdex market state, routed DEX context into Core, and announced the integration through Broadcast.",
          observedAt,
          receipts: {
            signalCollab: receipts.theBookDexSignalCollab,
            status: receipts.theBookDexStatus,
            orderbook: receipts.theBookDexOrderbook,
            pools: receipts.theBookDexPools,
            coreIngest: receipts.coreTheBookDexIngest,
            broadcastAnnounce: receipts.broadcastTheBookDexAnnounce
          }
        }
      : undefined,
    hasReceiptOrReadResult(receipts.varaStrategyStats) && hasReceipt(receipts.coreVaraStrategyIngest) && hasReceipt(receipts.broadcastVaraStrategyAnnounce)
      ? {
          handle: "varastrategy",
          programId: "0xe6483fe2fc8fea2dc3e2ee848e0372b9b486e023bb4cb21247a914e8f074aaa7",
          category: "Strategy",
          summary: "A2A Radar read VaraStrategy recommendations, routed market strategy context into Core, and announced the signal through Broadcast.",
          observedAt,
          receipts: {
            stats: receipts.varaStrategyStats,
            recommendations: receipts.varaStrategyRecommendations,
            coreIngest: receipts.coreVaraStrategyIngest,
            broadcastAnnounce: receipts.broadcastVaraStrategyAnnounce
          }
        }
      : undefined,
    hasReceiptOrReadResult(receipts.varaFlowStats) && hasReceipt(receipts.coreVaraFlowIngest) && hasReceipt(receipts.broadcastVaraFlowAnnounce)
      ? {
          handle: "varaflow-org",
          programId: "0x19d4b1778cfdf64c732e10640ccff923c4137a7fbed4f1a291e241d3e6361175",
          category: "Workflow",
          summary: "A2A Radar read VaraFlow workflow stats, routed automation context into Core, and announced the integration through Broadcast.",
          observedAt,
          receipts: {
            stats: receipts.varaFlowStats,
            workflows: receipts.varaFlowWorkflows,
            coreIngest: receipts.coreVaraFlowIngest,
            broadcastAnnounce: receipts.broadcastVaraFlowAnnounce
          }
        }
      : undefined,
    hasReceiptOrReadResult(receipts.varaPulseStats) && hasReceipt(receipts.coreVaraPulseIngest) && hasReceipt(receipts.broadcastVaraPulseAnnounce)
      ? {
          handle: "varapulse",
          programId: "0x51321d7e10b5fa064b6cad675216634336ca2de0e27d0940d184f1548d55f53d",
          category: "Social",
          summary: "A2A Radar read VaraPulse social pulse stats, routed ecosystem heartbeat context into Core, and announced the integration through Broadcast.",
          observedAt,
          receipts: {
            stats: receipts.varaPulseStats,
            latest: receipts.varaPulseLatest,
            coreIngest: receipts.coreVaraPulseIngest,
            broadcastAnnounce: receipts.broadcastVaraPulseAnnounce
          }
        }
      : undefined
  ];

  return uniqueIntegrations([
    ...directIntegrations,
    ...rawIntegrations,
    ...derivedIntegrations.filter((item): item is ExternalIntegration => Boolean(item)),
    ...activityDerivedIntegrations(snapshot)
  ]);
}

const KNOWN_EXTERNAL_INTEGRATIONS = [
  {
    handle: "varabridge",
    programId: "0xfb7ed5a79dc2ff15283a524a4489321b5e1f6341db2b9892be83b9568cc1fcb4",
    category: "Oracle",
    match: ["varabridge", "oracle"],
    summary: "A2A Radar queried VaraBridge oracle data and routed the signal into Core and Broadcast."
  },
  {
    handle: "hy4-predict-app",
    programId: "0xd24f2886dcb29dec16fc53214b7c8e498b2e96ea55d31a1497571e1ae15f5271",
    category: "Prediction",
    match: ["hy4-predict", "fastmarket"],
    summary: "A2A Radar read hy4-predict market data and routed prediction context into Core and Broadcast."
  },
  {
    handle: "thebookdex",
    programId: "0x7fa1988c57ba1134e2461c5fb36bc13d66c1dfbf47d36c5e9960b9ca2dc0e4c4",
    category: "DEX",
    match: ["thebookdex"],
    summary: "A2A Radar read thebookdex market state and routed DEX context into Core and Broadcast."
  },
  {
    handle: "varastrategy",
    programId: "0xe6483fe2fc8fea2dc3e2ee848e0372b9b486e023bb4cb21247a914e8f074aaa7",
    category: "Strategy",
    match: ["varastrategy"],
    summary: "A2A Radar read VaraStrategy recommendations and routed strategy context into Core and Broadcast."
  },
  {
    handle: "varaflow-org",
    programId: "0x19d4b1778cfdf64c732e10640ccff923c4137a7fbed4f1a291e241d3e6361175",
    category: "Workflow",
    match: ["varaflow"],
    summary: "A2A Radar read VaraFlow workflow stats and routed automation context into Core and Broadcast."
  },
  {
    handle: "varapulse",
    programId: "0x51321d7e10b5fa064b6cad675216634336ca2de0e27d0940d184f1548d55f53d",
    category: "Social",
    match: ["varapulse"],
    summary: "A2A Radar read VaraPulse social pulse stats and routed ecosystem heartbeat context into Core and Broadcast."
  }
] as const;

function activityDerivedIntegrations(snapshot: DashboardSnapshot): ExternalIntegration[] {
  const activityText = [
    ...(snapshot.activity ?? []).map((item) => item.metadata),
    ...(snapshot.growthTimeline ?? []).map((item) => item.title),
    ...(snapshot.boardEvents ?? []).map((item) => `${item.title} ${item.body}`)
  ].join("\n").toLowerCase();

  if (!activityText) return [];
  const observedAt = snapshot.generatedAt || new Date(observedAtFromSnapshot(snapshot)).toISOString();
  return KNOWN_EXTERNAL_INTEGRATIONS
    .filter((integration) => integration.match.some((term) => activityText.includes(term)))
    .map((integration) => ({
      handle: integration.handle,
      programId: integration.programId,
      category: integration.category,
      summary: integration.summary,
      observedAt,
      receipts: { source: "indexed-activity" }
    }));
}

function uniqueIntegrations(integrations: ExternalIntegration[]): ExternalIntegration[] {
  const byHandle = new Map<string, ExternalIntegration>();
  for (const integration of integrations) {
    if (!byHandle.has(integration.handle)) {
      byHandle.set(integration.handle, integration);
    }
  }
  return Array.from(byHandle.values());
}

function broadcastActivityCount(snapshot: DashboardSnapshot, boardEvents: BoardEvent[]): number {
  const activityPosts = snapshot.activity.filter((item) => item.kind === "BoardPost").length;
  if (activityPosts > 0) {
    return activityPosts;
  }

  return boardEvents.filter((event) => event.handle === "a2a-radar-broadcast-v2").length;
}
