"use client";

import { newId } from "../saykind/log";
import { getLog } from "../saykind/log";
import { getPracticeEvents } from "../../src/core/practiceLog";
import { assembleReportInput, hasAnyPractice, latestTranscript } from "./assemble";
import { requestReport } from "./client";
import { saveReport } from "./store";
import { buildTemplateReport } from "./template";
import { DISCLAIMER, type SavedReport } from "./types";

const ADAPTIVE_LEVEL_KEY = "saykind_adaptive_level";
const DAY_MS = 24 * 60 * 60 * 1000;

/** The level Level 1 saved on this device, or null if there is none. */
function savedAdaptiveLevel(): number | null {
  try {
    const value = Number(window.localStorage.getItem(ADAPTIVE_LEVEL_KEY));
    return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Gathers the last day of practice on this device, asks for the report text, and keeps the result on this device.
 * Only the compact counts go to the server; the conversation text and any audio or images never do.
 */
export async function makeReport(now: number = Date.now()): Promise<SavedReport> {
  const events = getLog();
  const input = assembleReportInput({ events, cameraEvents: getPracticeEvents(), adaptiveLevel: savedAdaptiveLevel(), now });
  // With nothing to report there is nothing to send: the fixed template says so.
  const { content, source } = hasAnyPractice(input) ? await requestReport(input) : { content: buildTemplateReport(input), source: "template" as const };
  const report: SavedReport = {
    id: newId(),
    createdAt: now,
    source,
    input,
    content,
    disclaimer: DISCLAIMER,
    transcript: latestTranscript(events, now - DAY_MS),
  };
  saveReport(report);
  return report;
}
