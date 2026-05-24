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

const LIVE_API_BASE = "https://a2a-radar.onrender.com";

function apiBases() {
  return [
    process.env.RADAR_API_URL,
    process.env.NEXT_PUBLIC_RADAR_API_URL,
    process.env.API_URL,
    process.env.NEXT_PUBLIC_API_URL,
    LIVE_API_BASE
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.replace(/\/$/, ""))
    .filter((value, index, values) => values.indexOf(value) === index);
}

export async function GET() {
  for (const base of apiBases()) {
    try {
      const response = await fetch(`${base}/api/growth-receipt`, { cache: "no-store" });
      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch {
      // Try the next configured API base before falling back to local artifacts.
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
