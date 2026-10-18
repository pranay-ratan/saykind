"use client";

import { useMemo, useRef, useState } from "react";
import { mightBenefit, summarise, useLog, type PracticeEvent, type WordSummary } from "../log";
import { playSample, useSamples, type Sample } from "../samples";
import { useSettings, type Settings } from "../settings";
import { buildReportText } from "../summary";

/**
 * CAREGIVER REPORT CONTROLLER. Everything the caregiver view shows, already filtered by what the person has authorized
 * (Settings.share). Nothing is exposed that has not been switched on. Recognition results are uncertain by nature and
 * must be labelled that way in any UI; there are no scores.
 *
 * PROTOTYPE: reads the practice record stored on THIS device. Showing it on a caregiver's own device needs caregiver
 * accounts, a server and a stored record of consent (see README).
 */
export type CaregiverReport = {
  caregiverName: string;
  sharing: Settings["share"];
  isAnythingShared: boolean;
  /** Present only when "progress" is shared. */
  totals: { wordsPracticed: number; attempts: number; retries: number; lastPracticeTs: number } | null;
  /** Per word. Assistance counts (normalPlays, slowPlays, helpUses) are zeroed unless "assistance" is shared. */
  words: WordSummary[];
  /** Words that may benefit from more practice; a prompt, not a conclusion. */
  mayBenefitFromPractice: WordSummary[];
  helpRequests: Extract<PracticeEvent, { type: "help_request" }>[];
  /** Only samples the person approved, and only if "audio" is shared. */
  sharedSamples: Sample[];
  playingSampleId: string | null;
  playSample: (id: string) => void;
  stopSample: () => void;
  reportText: () => string;
  isPrototype: true;
};

export function useCaregiverReport(): CaregiverReport {
  const settings = useSettings();
  const events = useLog();
  const samples = useSamples();
  const [playing, setPlaying] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const { progress, assistance, audio, helpRequests } = settings.share;

  const words = useMemo(() => {
    if (!progress) return [];
    return summarise(events)
      .filter((w) => w.attempts > 0 || w.normalPlays > 0 || w.slowPlays > 0 || w.helpUses > 0)
      .map((w) => (assistance ? w : { ...w, normalPlays: 0, slowPlays: 0, helpUses: 0 }));
  }, [events, progress, assistance]);

  const totals = progress
    ? { wordsPracticed: words.length, attempts: words.reduce((n, w) => n + w.attempts, 0), retries: words.reduce((n, w) => n + w.retries, 0), lastPracticeTs: words.reduce((t, w) => Math.max(t, w.lastTs), 0) }
    : null;

  return {
    caregiverName: settings.caregiverName,
    sharing: settings.share,
    isAnythingShared: progress || assistance || audio || helpRequests,
    totals,
    words,
    mayBenefitFromPractice: assistance ? words.filter(mightBenefit) : words.filter((w) => w.attempts >= 3),
    helpRequests: helpRequests ? events.filter((e): e is Extract<PracticeEvent, { type: "help_request" }> => e.type === "help_request").slice(-8).reverse() : [],
    sharedSamples: audio ? samples.filter((s) => s.approvedForCaregiver).slice(0, 12) : [],
    playingSampleId: playing,
    playSample: (id) => {
      stopRef.current?.();
      const sample = samples.find((s) => s.id === id);
      if (!sample) return;
      setPlaying(id);
      stopRef.current = playSample(sample, () => setPlaying((p) => (p === id ? null : p)));
    },
    stopSample: () => stopRef.current?.(),
    reportText: () => buildReportText(events, { progress, assistance }, settings.caregiverName),
    isPrototype: true,
  };
}
