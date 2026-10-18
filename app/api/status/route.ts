import { connection, NextResponse } from "next/server";
import { missingConfig } from "@/lib/server/openai";

/** Lets the page say plainly when the voice service isn't set up, instead of faking it. */
export async function GET() {
  await connection(); // read the environment per request, never at build time
  const missing = missingConfig();
  return NextResponse.json({ configured: missing.length === 0, missing }, { headers: { "Cache-Control": "no-store" } });
}
