"use client";

/**
 * Recordings kept on this device (IndexedDB), only when the person chooses to keep them:
 *   "attempt" samples: a practice attempt (Levels 1 to 3)
 *   "session" samples: a real-world conversation the person recorded on purpose (Level 4)
 * Nothing is uploaded. A sample can only reach a caregiver through a share action the person takes.
 */
export type Sample = {
  id: string;
  kind: "attempt" | "session";
  ts: number;
  durationMs: number;
  mimeType: string;
  blob: Blob;
  itemId?: string;
  itemText?: string;
  /** The person approved this recording for their caregiver to hear. */
  approvedForCaregiver: boolean;
};

const DB = "saykind";
const STORE = "samples";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no-indexeddb"));
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const listeners = new Set<() => void>();
export const onSamplesChanged = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const changed = () => listeners.forEach((listener) => listener());

export async function saveSample(sample: Sample): Promise<boolean> {
  try {
    await tx("readwrite", (store) => store.put(sample));
    changed();
    return true;
  } catch {
    return false;
  }
}

export async function listSamples(): Promise<Sample[]> {
  try {
    const all = await tx<Sample[]>("readonly", (store) => store.getAll());
    return all.sort((a, b) => b.ts - a.ts);
  } catch {
    return [];
  }
}

export async function deleteSample(id: string) {
  try {
    await tx("readwrite", (store) => store.delete(id));
    changed();
  } catch {
    // nothing to delete
  }
}

export async function setApproved(id: string, approved: boolean) {
  try {
    const sample = await tx<Sample | undefined>("readonly", (store) => store.get(id));
    if (sample) await saveSample({ ...sample, approvedForCaregiver: approved });
  } catch {
    // ignore
  }
}

export async function deleteAllSamples() {
  try {
    await tx("readwrite", (store) => store.clear());
    changed();
  } catch {
    // ignore
  }
}

import { useEffect, useState } from "react";

/** The saved recordings, kept current as they change. */
export function useSamples(): Sample[] {
  const [samples, setSamples] = useState<Sample[]>([]);
  useEffect(() => {
    let alive = true;
    const refresh = () => void listSamples().then((all) => alive && setSamples(all));
    refresh();
    const off = onSamplesChanged(refresh);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return samples;
}

/** Play a saved recording once. Returns a stop function. */
export function playSample(sample: Sample, onEnd: () => void): () => void {
  const url = URL.createObjectURL(sample.blob);
  const audio = new Audio(url);
  const done = () => {
    URL.revokeObjectURL(url);
    onEnd();
  };
  audio.onended = done;
  audio.onerror = done;
  void audio.play().catch(done);
  return () => {
    audio.pause();
    done();
  };
}
