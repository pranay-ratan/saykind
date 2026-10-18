"use client";

import { createLocalStore } from "../saykind/store";
import type { SavedReport } from "./types";

const MAX_REPORTS = 30;
const store = createLocalStore<SavedReport[]>("saykind.reports.v1", []);

export const useReports = (): SavedReport[] => store.use();
export const getReports = (): SavedReport[] => store.get();
export const getReport = (id: string): SavedReport | undefined => store.get().find((report) => report.id === id);

export const saveReport = (report: SavedReport): void => store.update((reports) => [report, ...reports.filter((item) => item.id !== report.id)].slice(0, MAX_REPORTS));
export const deleteReport = (id: string): void => store.update((reports) => reports.filter((report) => report.id !== id));
export const clearReports = (): void => store.set([]);
