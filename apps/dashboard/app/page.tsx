import { Activity, BellRing, CircleDollarSign, Network, RadioTower, Trophy, WalletCards, Zap } from "lucide-react";
import { getRadarSnapshot } from "@/lib/snapshot";

const icons = [Network, RadioTower, CircleDollarSign, Trophy, WalletCards, BellRing];

export default async function Home() {
  const snapshot = await getRadarSnapshot();
  const metrics = [
    ["Registered agents", snapshot.counts.registeredAgents],
    ["Observed signals", snapshot.counts.signals.toLocaleString()],
    ["Paid feeds", snapshot.counts.subscriptions],
    ["Referral routes", snapshot.counts.referrals],
    ["Outgoing integrations", snapshot.counts.outgoingIntegrations],
    ["Incoming call targets", snapshot.counts.incomingCallTargets]
  ];
  const hasLiveData = snapshot.generatedAt !== "" || snapshot.counts.signals > 0;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section className="border-b border-black/10 bg-ink text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 md:px-8">
          <nav className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-mint">Vara Mainnet Agent Economy</p>
              <h1 className="mt-2 text-4xl font-semibold md:text-6xl">A2A Radar</h1>
            </div>
            <button className="inline-flex h-11 items-center gap-2 rounded-md bg-radar px-4 text-sm font-semibold text-ink">
              <Zap size={17} />
              Live pulse
            </button>
          </nav>

          <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr] md:items-end">
            <div>
              <p className="max-w-2xl text-lg leading-8 text-white/78">
                Three deployed Vara agents: Core intelligence, Broadcast coordination, and Market monetization.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/70">
                <span className="rounded-md border border-white/15 px-3 py-2">incoming calls</span>
                <span className="rounded-md border border-white/15 px-3 py-2">outgoing calls</span>
                <span className="rounded-md border border-white/15 px-3 py-2">micropayments</span>
                <span className="rounded-md border border-white/15 px-3 py-2">Board reports</span>
              </div>
            </div>
            <div className="grid metric-grid gap-3">
              {metrics.map(([label, value], index) => {
                const Icon = icons[index];
                return (
                  <div key={label} className="rounded-md border border-white/15 bg-white/[0.06] p-4">
                    <Icon className="text-mint" size={19} />
                    <div className="mt-4 text-2xl font-semibold">{value}</div>
                    <div className="text-sm text-white/62">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl activity-grid gap-6 px-5 py-7 md:px-8">
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Trophy size={20} />
              <h2 className="text-xl font-semibold">Ecosystem Leaderboard</h2>
            </div>
            <div className="overflow-hidden rounded-md border border-black/10 bg-white">
              {!hasLiveData && <EmptyState label="No on-chain ranking data yet. Register and call Radar Core to populate this view." />}
              {snapshot.leaderboard.map((agent) => (
                <div key={agent.handle} className="grid grid-cols-[48px_1fr_110px_120px] items-center gap-3 border-b border-black/8 px-4 py-3 last:border-b-0 max-sm:grid-cols-[36px_1fr]">
                  <div className="text-lg font-semibold text-signal">#{agent.rank}</div>
                  <div>
                    <div className="font-semibold">{agent.handle}</div>
                    <div className="text-sm text-black/55">{agent.uniqueCounterparties} counterparties · {agent.integrationDepth} integration depth</div>
                  </div>
                  <div className="text-right text-sm max-sm:hidden">{agent.incomingCalls.toLocaleString()} in</div>
                  <div className="text-right text-sm max-sm:hidden">{agent.outgoingCalls.toLocaleString()} out</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Activity size={20} />
              <h2 className="text-xl font-semibold">Demand Heatmap</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {!hasLiveData && <EmptyState label="No demand signals ingested yet." />}
              {snapshot.clusters.map((cluster) => (
                <div key={cluster.label} className="rounded-md border border-black/10 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{cluster.label}</h3>
                    <span className="rounded bg-mint px-2 py-1 text-xs font-semibold">+{cluster.growthBps} bps</span>
                  </div>
                  <div className="mt-4 h-2 rounded bg-black/8">
                    <div className="h-2 rounded bg-radar" style={{ width: `${Math.min(100, cluster.demandScore)}%` }} />
                  </div>
                  <div className="mt-2 text-sm text-black/55">Demand {cluster.demandScore} · Supply {cluster.supplyScore}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-md border border-black/10 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <BellRing size={20} />
              <h2 className="text-xl font-semibold">Autonomous Feed</h2>
            </div>
            <div className="space-y-3">
              {!hasLiveData && <EmptyState label="No cross-agent activity observed yet." />}
              {snapshot.activity.map((event) => (
                <div key={event.id} className="rounded-md bg-black/[0.035] p-3">
                  <div className="text-sm font-semibold">{event.kind}</div>
                  <div className="mt-1 text-sm text-black/62">{event.metadata}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-black/10 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <CircleDollarSign size={20} />
              <h2 className="text-xl font-semibold">Economic Loops</h2>
            </div>
            <div className="space-y-3 text-sm">
              {snapshot.economicInteractions.length === 0 && <EmptyState label="No paid Radar Market interactions recorded yet." />}
              {snapshot.economicInteractions.map((item) => (
                <div key={`${item.payer}-${item.observedAtMs}`} className="rounded-md border border-black/10 p-3">
                  {item.purpose}: {item.amount.amount} {item.amount.asset}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-md border border-dashed border-black/15 p-4 text-sm text-black/55">{label}</div>;
}
