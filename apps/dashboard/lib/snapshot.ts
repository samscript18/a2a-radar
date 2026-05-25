import type { RadarSnapshot } from "@radar/types";
import { emptySnapshot } from "./demo-data";

export interface RadarSnapshotRaw {
	programIds?: {
		core?: string;
		broadcast?: string;
		market?: string;
	};
	marketTreasuryRaw?: string;
	latestGrowthReceipts?: Record<string, { result?: unknown; messageId?: string; txHash?: string }>;
	latestVaraBridgeIntegration?: ExternalIntegration;
	latestHy4PredictIntegration?: ExternalIntegration;
	latestTheBookDexIntegration?: ExternalIntegration;
	latestVaraStrategyIntegration?: ExternalIntegration;
	latestVaraFlowIntegration?: ExternalIntegration;
	latestVaraPulseIntegration?: ExternalIntegration;
}

export interface ExternalIntegration {
  handle: string;
  programId: string;
  category: string;
  summary: string;
  observedAt: string;
  receipts: Record<string, unknown>;
}

export type DashboardSnapshot = RadarSnapshot & {
	raw?: RadarSnapshotRaw;
	partners?: Array<{
		id: string;
		handle: string;
		track: string;
		status: string;
		description: string;
		githubUrl: string;
		registeredAtMs: number;
		integrationsIn: number;
		integrationsOut: number;
		uniquePartners: number;
		postsActive: number;
		messagesSent: number;
		integrationNote: string;
	}>;
	boardEvents?: Array<{
		id: string;
		postId: string;
		applicationId: string;
		handle: string;
		title: string;
		body: string;
		kind: string;
		tags: string[];
		postedAtMs: number;
	}>;
	ecosystemInteractions?: Array<{
		id: string;
		kind: string;
		caller: string;
		callerHandle?: string | null;
		callee: string;
		calleeHandle?: string | null;
		method?: string | null;
		valuePaidRaw?: string | null;
		blockNumber: number;
		observedAtMs: number;
	}>;
  latestSubscriptions?: Array<{
		id: string;
		tier: string;
		amount: { amount: string; asset: "VARA" };
		observedAtMs: number;
		source: string;
	}>;
  growthTimeline?: Array<{
		kind: string;
		title: string;
		observedAtMs: number;
    metadata: string;
  }>;
  externalIntegrations?: ExternalIntegration[];
};

export async function getRadarSnapshot(): Promise<DashboardSnapshot> {
	try {
		const apiBase = process.env.NEXT_PUBLIC_RADAR_API_URL ?? process.env.RADAR_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? "https://a2a-radar.onrender.com";
		const response = await fetch(`${apiBase}/snapshot`, { cache: "no-store" });
		if (!response.ok) {
			return emptySnapshot;
		}
		return (await response.json()) as DashboardSnapshot;
	} catch {
		return emptySnapshot;
	}
}
