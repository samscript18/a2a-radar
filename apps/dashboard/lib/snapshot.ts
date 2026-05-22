import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
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
}

export type DashboardSnapshot = RadarSnapshot & {
  raw?: RadarSnapshotRaw;
};

export async function getRadarSnapshot(): Promise<DashboardSnapshot> {
  try {
    const raw = await readFile(resolve(process.cwd(), "../../artifacts/latest-snapshot.json"), "utf8");
    return JSON.parse(raw) as DashboardSnapshot;
  } catch {
    return emptySnapshot;
  }
}
