import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const claudeJson = vi.fn();
vi.mock("./llm/claude", async (importOriginal) => ({ ...(await importOriginal<typeof import("./llm/claude")>()), claudeJson: (...args: unknown[]) => claudeJson(...args) }));

import { buildTemplateReport } from "../report/template";
import { generateReport } from "./report";
import type { ReportInput } from "../report/types";

const input: ReportInput = {
  date: "2026-10-18",
  level1: { words: [{ word: "chair", attempts: 3, replays: 1, slowPlays: 1, hints: 2, selfReports: 0 }], adaptiveLevel: 2, careNotes: [] },
  level2: { words: [] },
  cafe: null,
};
const good = { summary: "Practiced one word.", strengths: ["Kept going."], needsSupport: [], observations: ["Chair: 3 tries."], suggestedFocus: ["Revisit chair."], limits: "One short session." };

beforeEach(() => claudeJson.mockReset());

describe("generateReport", () => {
  it("returns the template when no key is set, without calling the model", async () => {
    const result = await generateReport(input, {});
    expect(result.source).toBe("template");
    expect(result.content).toEqual(buildTemplateReport(input));
    expect(claudeJson).not.toHaveBeenCalled();
  });

  it("uses the model's report when it is valid and calm", async () => {
    claudeJson.mockResolvedValueOnce(good);
    const result = await generateReport(input, { ANTHROPIC_API_KEY: "test-key", CLAUDE_MODEL: "test-model" });
    expect(result).toEqual({ content: good, source: "ai" });
    expect(claudeJson.mock.calls[0][0]).toMatchObject({ model: "test-model" });
  });

  it("falls back to the template on any error", async () => {
    claudeJson.mockRejectedValueOnce(new Error("boom"));
    expect((await generateReport(input, { ANTHROPIC_API_KEY: "test-key" })).source).toBe("template");
  });

  it("falls back to the template when the model uses scores or diagnostic words", async () => {
    claudeJson.mockResolvedValueOnce({ ...good, observations: ["Scored 80% on chair."] });
    expect((await generateReport(input, { ANTHROPIC_API_KEY: "test-key" })).source).toBe("template");
  });

  it("sends only the compact input to the model", async () => {
    claudeJson.mockResolvedValueOnce(good);
    await generateReport(input, { ANTHROPIC_API_KEY: "test-key" });
    const sent = JSON.stringify(claudeJson.mock.calls[0][0].messages);
    expect(sent).toContain("chair");
    expect(sent).not.toContain("test-key");
  });
});
