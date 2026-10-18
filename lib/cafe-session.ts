import type { Order } from "./order";

/**
 * One café visit, kept in memory while it happens and written to the practice log when the order is confirmed or the
 * person leaves. Every function returns a new session; nothing is mutated.
 */
export type SessionTurn = { who: "barista" | "patient"; text: string; ts: number };

export type CafeSession = {
  turns: readonly SessionTurn[];
  order: Order;
  /** Times the Help sheet was opened. */
  helpRequests: number;
  /** True once the menu pictures were opened or an answer was given by tapping. */
  menuHelpUsed: boolean;
  /** Turns where the barista could not make out the answer and asked again. */
  followUpsNeeded: number;
  startedAt: number;
  endedAt: number | null;
};

const EMPTY_ORDER_SNAPSHOT: Order = { drink: null, size: null, temperature: null, extras: [], finished: false };

export function newSession(startedAt: number = Date.now()): CafeSession {
  return { turns: [], order: EMPTY_ORDER_SNAPSHOT, helpRequests: 0, menuHelpUsed: false, followUpsNeeded: 0, startedAt, endedAt: null };
}

export const withTurn = (session: CafeSession, who: SessionTurn["who"], text: string, ts: number = Date.now()): CafeSession =>
  text.trim() ? { ...session, turns: [...session.turns, { who, text: text.trim(), ts }] } : session;

export const withOrder = (session: CafeSession, order: Order): CafeSession => ({ ...session, order: { ...order, extras: [...order.extras] } });
export const withHelpRequest = (session: CafeSession): CafeSession => ({ ...session, helpRequests: session.helpRequests + 1 });
export const withMenuUsed = (session: CafeSession): CafeSession => (session.menuHelpUsed ? session : { ...session, menuHelpUsed: true });
export const withFollowUp = (session: CafeSession): CafeSession => ({ ...session, followUpsNeeded: session.followUpsNeeded + 1 });
export const endSession = (session: CafeSession, endedAt: number = Date.now()): CafeSession => ({ ...session, endedAt });

/** A visit is worth recording once the person has said or tapped something. */
export const sessionHasContent = (session: CafeSession): boolean => session.turns.some((turn) => turn.who === "patient");

export const patientTurnCount = (session: CafeSession): number => session.turns.filter((turn) => turn.who === "patient").length;
