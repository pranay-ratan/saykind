"use client";

import { createLocalStore } from "./store";

/**
 * Where the person is in each exercise set, so closing the menu, switching levels or reloading the page never loses
 * their place. Stored on this device only.
 */
export type SetProgress = { index: number; completed: string[] };
type All = Record<string, SetProgress>;

const store = createLocalStore<All>("saykind.progress.v1", {});
const EMPTY: SetProgress = { index: 0, completed: [] };

export const useSetProgress = (setId: string): SetProgress => store.use()[setId] ?? EMPTY;
export const getSetProgress = (setId: string): SetProgress => store.get()[setId] ?? EMPTY;
export const saveSetProgress = (setId: string, progress: SetProgress) => store.update((all) => ({ ...all, [setId]: progress }));
export const clearProgress = () => store.set({});

/** Level 2 (the camera) lives on its own page, so its completion is recorded here, in the same store as Level 1's place. */
export const LEVEL2_SET_ID = "level2-camera";
const LEVEL_DONE: SetProgress = { index: 1, completed: ["practiced-a-word"] };

export const isSetComplete = (progress: SetProgress): boolean => progress.completed.length > 0;
export const markLevel2Complete = () => saveSetProgress(LEVEL2_SET_ID, LEVEL_DONE);
export const useLevel2Complete = (): boolean => isSetComplete(useSetProgress(LEVEL2_SET_ID));
