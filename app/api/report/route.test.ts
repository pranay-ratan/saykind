import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

const input = {
  date: "2026-10-18",
  level1: { words: [{ word: "chair", attempts: 2, replays: 1, slowPlays: 0, hints: 0, selfReports: 1 }], adaptiveLevel: 1, careNotes: [] },
  level2: { words: [] },
  cafe: null,
};

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(new Request("http://localhost/api/report", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }));

let savedKey: string | undefined;
beforeEach(() => {
  savedKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "";
});
afterEach(() => {
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
  vi.restoreAllMocks();
});

describe("POST /api/report", () => {
  it("returns the fixed template when no key is set", async () => {
    const response = await post({ input });
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.source).toBe("template");
    expect(data.content.summary).toContain("2026-10-18");
  });

  it("rejects input that is not the compact report shape", async () => {
    expect((await post({ input: { ...input, extra: "x", date: "today" } })).status).toBe(400);
    expect((await post("not json")).status).toBe(400);
    expect((await post({})).status).toBe(400);
  });

  it("rejects an oversized body", async () => {
    expect((await post({ input }, { "content-length": "999999" })).status).toBe(413);
    const long = { input: { ...input, level1: { ...input.level1, careNotes: Array(5).fill("x".repeat(200)) }, pad: "y".repeat(20_000) } };
    expect((await post(long)).status).toBe(413);
  });

  it("does not log what it was sent", async () => {
    const spies = [vi.spyOn(console, "log"), vi.spyOn(console, "error"), vi.spyOn(console, "warn")];
    await post({ input });
    for (const spy of spies) expect(JSON.stringify(spy.mock.calls)).not.toContain("chair");
  });
});
