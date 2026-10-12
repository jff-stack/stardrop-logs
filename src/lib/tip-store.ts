"use client";

// What this browser has already been shown, so tips rotate and a dismissed one
// stays dismissed for the day. It lives in localStorage only: it is never sent
// anywhere, there is no analytics, and it holds ids and dates, nothing else.
//
// Every access is wrapped: private mode and blocked storage just mean the
// tips repeat a little sooner (an in-memory copy keeps the page itself
// consistent). `persist: false` keeps a write in memory only, which is what
// the sample garden does so a visitor leaves nothing behind.
import { useSyncExternalStore } from "react";
import type { SeenTip } from "./coach";

const SEEN_KEY = "stardrop.tips.seen";
const DISMISSED_KEY = "stardrop.tips.dismissed";
const REMINDER_KEY = "stardrop.reminder.dismissed";
/** Two weeks of tips is a few dozen at most; this is a safety cap. */
export const SEEN_MAX = 60;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9-]{1,40}$/;

export interface TipStoreState {
  seen: SeenTip[];
  /** The local day the tip card was last put away with "Not now". */
  tipDay: string | null;
  /** The local day a reminder was last put away. */
  reminderDay: string | null;
}

/** Keeps only well-formed entries, newest last, at most SEEN_MAX. */
export function parseSeen(raw: string | null): SeenTip[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const out: SeenTip[] = [];
    for (const item of data) {
      if (item && typeof item === "object") {
        const { id, day } = item as Record<string, unknown>;
        if (typeof id === "string" && typeof day === "string" && ID.test(id) && DAY.test(day)) out.push({ id, day });
      }
    }
    return out.slice(-SEEN_MAX);
  } catch {
    return [];
  }
}

const dayOrNull = (v: string | null) => (v && DAY.test(v) ? v : null);

// ------------------------------------------------------------------ storage

const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string, persist: boolean) {
  // The in-memory copy serves a memory-only write, or a visit whose storage is
  // blocked. A stored value is read straight from storage, so other tabs' changes show.
  let stored = false;
  if (persist) {
    try {
      window.localStorage.setItem(key, value);
      stored = true;
    } catch {
      // Storage blocked or full.
    }
  }
  if (stored) memory.delete(key);
  else memory.set(key, value);
  for (const l of listeners) l();
}

// One object per distinct stored state, so React sees a stable snapshot.
let cache: { key: string; value: TipStoreState } | null = null;

function snapshot(): TipStoreState {
  const seenRaw = read(SEEN_KEY);
  const tipRaw = read(DISMISSED_KEY);
  const reminderRaw = read(REMINDER_KEY);
  const key = JSON.stringify([seenRaw, tipRaw, reminderRaw]);
  if (cache?.key === key) return cache.value;
  const value: TipStoreState = {
    seen: parseSeen(seenRaw),
    tipDay: dayOrNull(tipRaw),
    reminderDay: dayOrNull(reminderRaw),
  };
  cache = { key, value };
  return value;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * What this browser remembers, or null during server render and hydration
 * (so the first client render matches the server's).
 */
export function useTipStore(): TipStoreState | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

// ------------------------------------------------------------------ writes

/** Remembers that `id` was shown on `day`. Once per id per day. */
export function rememberSeen(id: string, day: string, persist = true) {
  const current = parseSeen(read(SEEN_KEY));
  if (current.some((s) => s.id === id && s.day === day)) return;
  write(SEEN_KEY, JSON.stringify([...current, { id, day }].slice(-SEEN_MAX)), persist);
}

export const saveDismissedDay = (day: string, persist = true) => write(DISMISSED_KEY, day, persist);
export const saveReminderDismissedDay = (day: string, persist = true) => write(REMINDER_KEY, day, persist);
