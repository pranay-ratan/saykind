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
