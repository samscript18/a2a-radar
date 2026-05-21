import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RadarSnapshot } from "@radar/types";
import { emptySnapshot } from "./demo-data";

export async function getRadarSnapshot(): Promise<RadarSnapshot> {
  try {
    const raw = await readFile(resolve(process.cwd(), "../../artifacts/latest-snapshot.json"), "utf8");
    return JSON.parse(raw) as RadarSnapshot;
  } catch {
    return emptySnapshot;
  }
}
