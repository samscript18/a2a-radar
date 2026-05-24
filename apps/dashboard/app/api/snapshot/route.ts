import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import { emptySnapshot } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

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
      const response = await fetch(`${base}/snapshot`, { cache: "no-store" });
      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch {
      // Try the next configured API base before falling back to local artifacts.
    }
  }

  try {
    const raw = await readFile(resolve(process.cwd(), "../../artifacts/latest-snapshot.json"), "utf8");
    return new NextResponse(raw, {
      headers: { "content-type": "application/json" }
    });
  } catch {
    return NextResponse.json(emptySnapshot, { status: 200 });
  }
}
