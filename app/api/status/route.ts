import { connection, NextResponse } from "next/server";
import { providerStatus } from "@/lib/server/providers";

/**
 * Lets the page say plainly which providers are active and which key names are present. Names and yes/no answers
 * only; no key value is ever returned.
 */
export async function GET() {
  await connection(); // read the environment per request, never at build time
  return NextResponse.json(providerStatus(process.env), { headers: { "Cache-Control": "no-store" } });
}
