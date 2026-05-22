import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import type { GrowthReceiptCycle, GrowthReceiptSummary } from "@/lib/receipts";

export const dynamic = "force-dynamic";

const EMPTY_RECEIPT: GrowthReceiptSummary = {
  exists: false,
  callsExecuted: 0,
  skipped: true,
  boardAnnouncementId: null,
  treasuryDeltaRaw: "0"
};

function apiBase() {
  return process.env.RADAR_API_URL ?? process.env.NEXT_PUBLIC_RADAR_API_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
}

export async function GET() {
  const base = apiBase();
  if (base) {
    try {
      const response = await fetch(`${base.replace(/\/$/, "")}/api/growth-receipt`, { cache: "no-store" });
      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch {
      // Fall through to local artifact or empty state.
    }
  }

  try {
    const raw = await readFile(resolve(process.cwd(), "../../artifacts/deploy/growth-loop-receipts.json"), "utf8");
    const cycles = JSON.parse(raw) as GrowthReceiptCycle[];
    const latest = cycles.at(-1);
    if (!latest) return NextResponse.json(EMPTY_RECEIPT);
    const receipts = latest.receipts ?? {};
    const callsExecuted = Object.values(receipts).filter((receipt) => receipt.messageId || receipt.txHash).length;
    const boardResult = receipts.boardAnnouncement?.result;
    const treasuryDeltaRaw = [
      receipts.marketPaidRecommendation?.messageId ? 10_000_000_000n : 0n,
      receipts.marketSubscription?.messageId ? 25_000_000_000n : 0n
    ].reduce((sum, item) => sum + item, 0n);

    return NextResponse.json({
      exists: true,
      startedAt: latest.startedAt,
      completedAt: latest.completedAt,
      callsExecuted,
      skipped: callsExecuted === 0,
      boardAnnouncementId: typeof boardResult === "string" ? boardResult : null,
      treasuryDeltaRaw: treasuryDeltaRaw.toString()
    } satisfies GrowthReceiptSummary);
  } catch {
    return NextResponse.json(EMPTY_RECEIPT);
  }
}
