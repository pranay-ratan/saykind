import { NextResponse } from "next/server";
import { sanitizeOrder, type HistoryItem } from "@/lib/order";
import { runBaristaTurn, type TurnInput } from "@/lib/server/barista";
import { failure, guard } from "@/lib/server/guard";

// Hosted functions are cut off after this many seconds (the provider call itself times out at 45 s).
export const maxDuration = 60;

const SLOTS = ["drink", "size", "temperature", "extras"] as const;

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function parseHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-12).flatMap((item): HistoryItem[] => {
    if (typeof item !== "object" || item === null) return [];
    const { role, text, via } = item as Record<string, unknown>;
    if (role !== "barista" && role !== "patient") return [];
    return [
      {
        role,
        text: cleanText(text, 400),
        via: via === "speech" || via === "tap" || via === "silence" ? via : undefined,
      },
    ];
  });
}

/** One conversational turn: the patient's words in, the barista's reply and the updated order out. */
export async function POST(request: Request) {
  const blocked = guard(request, "converse");
  if (blocked) return blocked;

  if (Number(request.headers.get("content-length") ?? 0) > 64_000) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const patient = (body.patient ?? {}) as Record<string, unknown>;
  const via = patient.via === "tap" || patient.via === "silence" ? patient.via : "speech";
  const text = cleanText(patient.text, 600);

  const tapped = (body.tapped ?? null) as Record<string, unknown> | null;
  const tappedSlot = SLOTS.find((slot) => slot === tapped?.slot);

  const input: TurnInput = {
    history: parseHistory(body.history),
    order: sanitizeOrder(body.order),
    patient: { via: via === "speech" && !text ? "silence" : via, text },
    tapped: via === "tap" && tappedSlot ? { slot: tappedSlot, id: cleanText(tapped?.id, 40) } : undefined,
    unclearStreak: Math.min(Math.max(Number(body.unclearStreak) || 0, 0), 10),
  };

  try {
    const result = await runBaristaTurn(input);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
