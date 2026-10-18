import { describe, expect, it } from "vitest";
import { endSession, newSession, patientTurnCount, sessionHasContent, withFollowUp, withHelpRequest, withMenuUsed, withOrder, withTurn } from "./cafe-session";

describe("café session", () => {
  it("adds turns without changing the original and ignores empty text", () => {
    const start = newSession(100);
    const next = withTurn(withTurn(start, "barista", "What can I get for you?", 101), "patient", "  latte  ", 102);
    expect(start.turns).toHaveLength(0);
    expect(next.turns.map((turn) => turn.who)).toEqual(["barista", "patient"]);
    expect(next.turns[1].text).toBe("latte");
    expect(withTurn(next, "patient", "   ", 103)).toBe(next);
  });

  it("counts help, menu use and follow-ups", () => {
    const session = withFollowUp(withMenuUsed(withMenuUsed(withHelpRequest(newSession(1)))));
    expect(session).toMatchObject({ helpRequests: 1, menuHelpUsed: true, followUpsNeeded: 1 });
  });

  it("records the order and the end time", () => {
    const order = { drink: "latte" as const, size: "large" as const, temperature: "hot" as const, extras: [], finished: true };
    const done = endSession(withOrder(newSession(1), order), 9);
    expect(done.order.drink).toBe("latte");
    expect(done.endedAt).toBe(9);
  });

  it("only has content once the patient has taken a turn", () => {
    const session = withTurn(newSession(1), "barista", "Hello", 2);
    expect(sessionHasContent(session)).toBe(false);
    const talked = withTurn(session, "patient", "tea", 3);
    expect(sessionHasContent(talked)).toBe(true);
    expect(patientTurnCount(talked)).toBe(1);
  });
});
