"use client";

import { createLocalStore } from "./store";

/**
 * What the person has chosen about sharing. EVERYTHING is off until they turn it on, and they can turn any of it off
 * again. The caregiver view only ever shows what is switched on here.
 */
export type Settings = {
  caregiverName: string;
  caregiverPhone: string;
  /** Used only to start an email or label a report when the person taps. Never sent anywhere on its own. */
  doctorName: string;
  doctorEmail: string;
  /** Save recordings of practice attempts on this device (needed before any sample can be shared). */
  keepPracticeAudio: boolean;
  share: {
    /** Which words were practiced, how many tries, and when. */
    progress: boolean;
    /** Whether hearing the word again, slowly, hints or help were used. */
    assistance: boolean;
    /** Saved practice recordings the person has approved. */
    audio: boolean;
    /** That the person asked for help. */
    helpRequests: boolean;
  };
};

export const DEFAULT_SETTINGS: Settings = {
  caregiverName: "",
  caregiverPhone: "",
  doctorName: "",
  doctorEmail: "",
  keepPracticeAudio: false,
  share: { progress: false, assistance: false, audio: false, helpRequests: false },
};

const store = createLocalStore<Settings>("saykind.settings.v1", DEFAULT_SETTINGS);

export const useSettings = () => {
  const settings = store.use();
  return { ...DEFAULT_SETTINGS, ...settings, share: { ...DEFAULT_SETTINGS.share, ...settings.share } };
};
export const getSettings = () => {
  const settings = store.get();
  return { ...DEFAULT_SETTINGS, ...settings, share: { ...DEFAULT_SETTINGS.share, ...settings.share } };
};
export const updateSettings = (change: (current: Settings) => Settings) => store.update((current) => change({ ...DEFAULT_SETTINGS, ...current, share: { ...DEFAULT_SETTINGS.share, ...current.share } }));
export const resetSettings = () => store.set(DEFAULT_SETTINGS);

/* ---- small actions for the settings UI (so components never touch storage directly) ---- */
export const setCaregiver = (caregiverName: string, caregiverPhone: string) => updateSettings((s) => ({ ...s, caregiverName, caregiverPhone }));
export const setDoctor = (doctorName: string, doctorEmail: string) => updateSettings((s) => ({ ...s, doctorName, doctorEmail }));
export const setShareCategory = (category: keyof Settings["share"], value: boolean) => updateSettings((s) => ({ ...s, share: { ...s.share, [category]: value } }));
export const setKeepPracticeAudio = (keepPracticeAudio: boolean) => updateSettings((s) => ({ ...s, keepPracticeAudio }));
