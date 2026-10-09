"use client";

// The current time, rounded to the minute. It's null during server render and
// hydration and the real local time after that, so anything timezone-based
// (garden days, "3h ago", greetings) renders the same on server and client.
import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, 30_000);
  return () => clearInterval(id);
};

// Rounded to the minute so the snapshot is stable between renders.
const getSnapshot = () => Math.floor(Date.now() / 60_000);
const getServerSnapshot = () => null;

export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return minute === null ? null : new Date(minute * 60_000);
}
