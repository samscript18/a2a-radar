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
import { formatDateTime, formatRawVara, shortenAddress } from "@/lib/format";
import { getLatestGrowthReceipt } from "@/lib/receipts";
import { getRadarSnapshot, type DashboardSnapshot } from "@/lib/snapshot";

const CANONICAL_IDS = {
  core: "0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503",
  broadcast: "0x5a46382a5ae2021e0eb3b597fdfed14fdc4b0f14ee87bd2b014c8314be14b21a",
  market: "0xb9601e1bffa349bae1f1eb94b71caaee832caf3f8145e0eabb26d288d80ae176"
};

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

export default async function Home() {
  const snapshot = await getRadarSnapshot();
  const receipt = await getLatestGrowthReceipt();
  const hasIndexedData = snapshot.generatedAt !== "" || snapshot.counts.signals > 0 || snapshot.economicInteractions.length > 0;
  const boardAnnouncementId = latestBoardAnnouncementId(snapshot) ?? receipt.boardAnnouncementId;
  const treasuryRaw = snapshot.raw?.marketTreasuryRaw ?? totalEconomicRaw(snapshot);
  const latestPaid = snapshot.economicInteractions.at(-1);

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
        ["activity", snapshot.activity.filter((item) => item.kind === "BoardPost").length],
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
        ["subscriptions", snapshot.counts.subscriptions],
        ["payments", snapshot.economicInteractions.length],
        ["treasury", formatRawVara(treasuryRaw)]
      ]
    }
  ];

  const metrics: MetricModel[] = [
    ["Signals", snapshot.counts.signals.toLocaleString(), Activity],
    ["Subscriptions", snapshot.counts.subscriptions.toLocaleString(), WalletCards],
    ["Outgoing integrations", snapshot.counts.outgoingIntegrations.toLocaleString(), Route],
    ["Economic interactions", snapshot.economicInteractions.length.toLocaleString(), CircleDollarSign],
    ["Market treasury", formatRawVara(treasuryRaw), DatabaseZap],
    ["Board announcement", boardAnnouncementId ?? "not indexed", BellRing]
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#070b1a] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(124,58,237,0.22),transparent_28%),radial-gradient(circle_at_86%_14%,rgba(34,211,238,0.16),transparent_26%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,48px_48px,48px_48px]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 md:px-8 md:py-8">
        <Hero snapshot={snapshot} hasIndexedData={hasIndexedData} />

        <section className="grid gap-4 lg:grid-cols-3">
          {agentCards.map((agent) => (
            <AgentCard key={agent.title} {...agent} hasIndexedData={hasIndexedData} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Panel title="Activity Flow" icon={<Blocks size={18} />} subtitle="The recurring v2 loop shown from live orchestration receipts.">
              <div className="grid gap-3 md:grid-cols-5">
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
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metrics.map(([label, value, Icon]) => (
                  <Metric key={label} label={label} value={value} icon={Icon} />
                ))}
              </div>
            </Panel>

            <Panel title="Recent Receipts" icon={<ReceiptText size={18} />} subtitle="Latest autonomous growth-cycle receipt file.">
              {receipt.exists ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

          <aside className="space-y-6">
            <Panel title="Treasury / Micropayments" icon={<CircleDollarSign size={18} />} subtitle="Micro-payments validate the Economy & Markets track.">
              <div className="rounded-md border border-cyan-300/15 bg-cyan-300/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Raw treasury units</p>
                <p className="mt-2 break-all font-mono text-lg text-cyan-100">{treasuryRaw}</p>
                <p className="mt-3 text-3xl font-semibold text-white">{formatRawVara(treasuryRaw)}</p>
              </div>
              <div className="mt-3">
                {latestPaid ? (
                  <div className="rounded-md border border-white/10 bg-white/[0.045] p-4">
                    <p className="text-sm font-semibold text-white">{latestPaid.purpose}</p>
                    <p className="mt-1 text-sm text-slate-400">{formatRawVara(latestPaid.amount.amount)} from {shortenAddress(latestPaid.payer)}</p>
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(latestPaid.observedAtMs)}</p>
                  </div>
                ) : (
                  <EmptyState label="No paid interaction indexed yet." />
                )}
              </div>
            </Panel>

            <Panel title="Demand / Opportunity Feed" icon={<Sparkles size={18} />} subtitle="Current clusters and opportunities from Core.">
              <div className="space-y-3">
                {snapshot.clusters.length === 0 && snapshot.opportunities.length === 0 && <EmptyState label="No demand clusters or opportunities indexed yet." />}
                {snapshot.clusters.slice(0, 3).map((cluster) => (
                  <div key={cluster.label} className="rounded-md border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{cluster.label}</p>
                      <span className="rounded bg-cyan-300/10 px-2 py-1 text-xs font-semibold text-cyan-200">+{cluster.growthBps} bps</span>
                    </div>
                    <div className="mt-4 h-2 rounded bg-white/10">
                      <div className="h-2 rounded bg-cyan-300" style={{ width: `${Math.min(100, Math.max(4, cluster.demandScore))}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-slate-400">Demand {cluster.demandScore} / Supply {cluster.supplyScore}</p>
                  </div>
                ))}
                {snapshot.opportunities.slice(0, 2).map((opportunity) => (
                  <div key={opportunity.id} className="rounded-md border border-violet-300/15 bg-violet-300/5 p-4">
                    <p className="font-semibold text-white">{opportunity.title}</p>
                    <p className="mt-1 text-sm text-slate-400">Expected value: {opportunity.expectedValue ? formatRawVara(opportunity.expectedValue.amount) : "not priced"}</p>
                  </div>
                ))}
              </div>
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
    <header className="rounded-md border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/30 backdrop-blur md:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" />
              Live on Vara Mainnet
            </span>
            <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1 text-violet-200">Canonical v2 only</span>
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">A2A Radar</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Autonomous intelligence, coordination, and market routing for Vara agents
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
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
    <article className="rounded-md border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/20 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <Icon size={22} />
        </div>
        <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">Live</span>
      </div>
      <h2 className="mt-4 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm font-medium text-violet-200">{track}</p>
      <p className="mt-3 min-h-12 text-sm leading-6 text-slate-400">{role}</p>
      <div className="mt-4 rounded-md border border-white/10 bg-black/20 p-3 font-mono text-xs text-slate-300">{shortenAddress(id, 10, 8)}</div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {counters.map(([label, value]) => (
          <div key={label} className="rounded-md border border-white/10 bg-white/[0.035] p-3">
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
    <section className="rounded-md border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/20 backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-white">
            <span className="text-cyan-200">{icon}</span>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: IconComponent }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-4">
      <Icon className="text-cyan-200" size={18} />
      <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function ReceiptStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2 text-cyan-200">{icon}<span className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</span></div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-md border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-slate-500">{label}</div>;
}

function latestBoardAnnouncementId(snapshot: DashboardSnapshot): string | null {
  const result = snapshot.raw?.latestGrowthReceipts?.boardAnnouncement?.result;
  return typeof result === "string" ? result : null;
}

function totalEconomicRaw(snapshot: RadarSnapshot): string {
  return snapshot.economicInteractions
    .reduce((sum, item) => sum + BigInt(item.amount.amount), 0n)
    .toString();
}
