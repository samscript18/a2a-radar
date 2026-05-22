import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface GrowthReceiptCycle {
  startedAt?: string;
  completedAt?: string;
  receipts?: Record<string, { messageId?: string; txHash?: string; result?: unknown; skipped?: boolean }>;
}

export interface GrowthReceiptSummary {
  exists: boolean;
  startedAt?: string;
  completedAt?: string;
  callsExecuted: number;
  skipped: boolean;
  boardAnnouncementId: string | null;
  treasuryDeltaRaw: string;
}

export async function getLatestGrowthReceipt(): Promise<GrowthReceiptSummary> {
  try {
    const raw = await readFile(resolve(process.cwd(), "../../artifacts/deploy/growth-loop-receipts.json"), "utf8");
    const cycles = JSON.parse(raw) as GrowthReceiptCycle[];
    const latest = cycles.at(-1);
    if (!latest) return emptyReceipt();
    const receipts = latest.receipts ?? {};
    const callsExecuted = Object.values(receipts).filter((receipt) => receipt.messageId || receipt.txHash).length;
    const boardResult = receipts.boardAnnouncement?.result;
    const treasuryDeltaRaw = [
      receipts.marketPaidRecommendation?.messageId ? 10_000_000_000n : 0n,
      receipts.marketSubscription?.messageId ? 25_000_000_000n : 0n
    ].reduce((sum, item) => sum + item, 0n);

    return {
      exists: true,
      startedAt: latest.startedAt,
      completedAt: latest.completedAt,
      callsExecuted,
      skipped: callsExecuted === 0,
      boardAnnouncementId: typeof boardResult === "string" ? boardResult : null,
      treasuryDeltaRaw: treasuryDeltaRaw.toString()
    };
  } catch {
    return emptyReceipt();
  }
}

function emptyReceipt(): GrowthReceiptSummary {
  return {
    exists: false,
    callsExecuted: 0,
    skipped: true,
    boardAnnouncementId: null,
    treasuryDeltaRaw: "0"
  };
}
