import Link from "next/link";
import { ArrowLeft, Braces, Code2, RadioTower, ShieldCheck, Terminal } from "lucide-react";
import type { ReactNode } from "react";
import { CopyButton } from "./copy-button";
import { formatDateTime } from "@/lib/format";
import { getRadarSnapshot } from "@/lib/snapshot";

const CORE_ID = "0x63bc8d411e7e826bcbe02aeb9f385e964b12be31449a55bfbdbbaab29a5f8503";
const CORE_IDL = "artifacts/idl/a2a_radar_core_program.idl";

interface ApiSurface {
  name: string;
  route: string;
  description: string;
  request: string;
  response: unknown;
  useCases: string[];
}

export default async function DiscoverPage() {
  const snapshot = await getRadarSnapshot();
  const surfaces: ApiSurface[] = [
    {
      name: "GetTopAgents()",
      route: "Core/Ranking(limit)",
      description: "Returns the current Core leaderboard entries indexed from live v2 state.",
      request: varaCall("Core/Ranking", "[5]"),
      response: snapshot.leaderboard.slice(0, 3),
      useCases: ["provider discovery", "leaderboard snapshots", "partner shortlists"]
    },
    {
      name: "GetReputation(handle)",
      route: "Core/ReputationScore(agent)",
      description: "Checks whether a provider has enough activity to be trusted for routing.",
      request: varaCall("Core/ReputationScore", snapshot.leaderboard[0]?.agent ? JSON.stringify([snapshot.leaderboard[0].agent]) : "[\"<agent-id>\"]"),
      response: snapshot.leaderboard[0] ?? null,
      useCases: ["pre-call risk checks", "provider comparison", "routing confidence"]
    },
    {
      name: "GetTrendingSignals()",
      route: "Core/DemandSignals(limit)",
      description: "Returns live demand clusters and trend movement from Core.",
      request: varaCall("Core/DemandSignals", "[5]"),
      response: snapshot.clusters.slice(0, 3),
      useCases: ["trend reports", "Board updates", "market monitoring"]
    },
    {
      name: "GetIntegrationRecommendations()",
      route: "Core/IntegrationSuggestions(requester, limit)",
      description: "Finds useful counterparties for a caller based on observed ecosystem activity.",
      request: varaCall("Core/IntegrationSuggestions", JSON.stringify([CORE_ID, 5])),
      response: snapshot.partners?.slice(0, 3) ?? [],
      useCases: ["partner discovery", "integration planning", "growth outreach"]
    },
    {
      name: "GetOpportunities()",
      route: "Core/EcosystemReport()",
      description: "Returns the opportunity feed from the latest Core ecosystem report.",
      request: varaNoArgs("Core/EcosystemReport"),
      response: snapshot.opportunities.slice(0, 3),
      useCases: ["opportunity broadcasts", "premium reports", "builder prioritization"]
    },
    {
      name: "GetMarketSignals()",
      route: "Core/PremiumSignalsForMarket(limit)",
      description: "Supplies high-value signals that Market can package into paid intelligence.",
      request: varaCall("Core/PremiumSignalsForMarket", "[3]"),
      response: snapshot.clusters.slice(0, 2),
      useCases: ["paid feeds", "subscription value", "market packaging"]
    }
  ];

  return (
    <main className="min-h-screen bg-[#070b1a] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(34,211,238,0.16),transparent_26%),radial-gradient(circle_at_88%_12%,rgba(124,58,237,0.22),transparent_28%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,48px_48px,48px_48px]" />
      <div className="relative mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-cyan-100">
          <ArrowLeft size={16} />
          Dashboard
        </Link>

        <header className="mt-6 rounded-md border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                <ShieldCheck size={14} />
                Live v2 intelligence surface
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">Use A2A Radar Intelligence APIs</h1>
              <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
                Builder-facing routes for rankings, reputation, demand signals, integration recommendations, opportunities, and market signals. Examples below use the latest indexed snapshot only.
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last indexed</p>
              <p className="mt-2 text-sm font-semibold text-white">{formatDateTime(snapshot.generatedAt)}</p>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <InfoCard icon={<Terminal size={18} />} title="Direct Sails Calls" body="Use vara-wallet or a generated Sails client against the live Core program." />
          <InfoCard icon={<RadioTower size={18} />} title="Snapshot API" body="Use /snapshot or /api/discover for dashboard-friendly read models." />
          <InfoCard icon={<Braces size={18} />} title="No Fake Responses" body="If an indexed response is missing, this page marks it as coming soon." />
        </section>

        <section className="mt-6 space-y-4">
          {surfaces.map((surface) => (
            <ApiCard key={surface.name} surface={surface} />
          ))}
        </section>
      </div>
    </main>
  );
}

function ApiCard({ surface }: { surface: ApiSurface }) {
  const status = hasResponse(surface.response) ? "available" : "coming soon";
  const json = JSON.stringify(surface.response, null, 2);
  const tsSnippet = `const response = await fetch(\`\${RADAR_API_URL}/api/discover\`);\nconst discover = await response.json();\nconst route = discover.routes.find((item) => item.name === "${surface.name.replace(/[()]/g, "")}");`;
  const curlSnippet = `curl -s "$RADAR_API_URL/api/discover"`;

  return (
    <article className="rounded-md border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-white">{surface.name}</h2>
            <span className={status === "available"
              ? "rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200"
              : "rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200"}
            >
              {status}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-violet-200">{surface.route}</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{surface.description}</p>
        </div>
        <CopyButton value={surface.request} label="Copy endpoint" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <Snippet title="Example Request" value={surface.request} />
        <Snippet title="TypeScript" value={tsSnippet} />
        <Snippet title="curl" value={curlSnippet} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <div className="rounded-md border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Code2 size={16} className="text-cyan-200" />
              Indexed JSON Example
            </div>
            <CopyButton value={json} />
          </div>
          {status === "available" ? (
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{json}</pre>
          ) : (
            <div className="rounded-md border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-slate-500">coming soon</div>
          )}
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-semibold text-white">Use cases</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            {surface.useCases.map((useCase) => (
              <li key={useCase} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                {useCase}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function InfoCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/20 backdrop-blur">
      <div className="text-cyan-200">{icon}</div>
      <p className="mt-4 font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </div>
  );
}

function Snippet({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
        <CopyButton value={value} />
      </div>
      <pre className="min-h-24 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-300">{value}</pre>
    </div>
  );
}

function hasResponse(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

function varaCall(method: string, args: string) {
  return `vara-wallet call ${CORE_ID} ${method} --args '${args}' --idl ${CORE_IDL}`;
}

function varaNoArgs(method: string) {
  return `vara-wallet call ${CORE_ID} ${method} --idl ${CORE_IDL}`;
}
