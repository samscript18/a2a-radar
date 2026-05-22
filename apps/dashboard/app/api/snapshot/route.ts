import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import { emptySnapshot } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

function apiBase() {
  return process.env.RADAR_API_URL ?? process.env.NEXT_PUBLIC_RADAR_API_URL ?? process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
}

export async function GET() {
  const base = apiBase();
  if (base) {
    try {
      const response = await fetch(`${base.replace(/\/$/, "")}/snapshot`, { cache: "no-store" });
      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch {
      // Fall through to local artifact or empty state.
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
