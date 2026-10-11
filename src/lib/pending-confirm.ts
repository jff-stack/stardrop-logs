// Remembers, for this browser tab only, which address just signed up and when
// the last confirmation email was asked for. /check-email uses it to prefill
// the "resend" box and to make people wait a minute between sends.
//
// It lives in sessionStorage so the address never goes in a URL and is gone
// when the tab closes. If storage is blocked, the box just starts empty.

export const RESEND_COOLDOWN_S = 60;

const EMAIL_KEY = "stardrop:pending-email";
const SENT_KEY = "stardrop:confirm-sent-at";

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

export function subscribePending(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function read(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Private mode or storage turned off: carry on without it.
  }
  changed();
}

export const pendingEmail = () => read(EMAIL_KEY);
/** When the last confirmation email was asked for (ms), or 0. */
export const lastSentAt = () => Number(read(SENT_KEY)) || 0;

export const rememberPending = (email: string) => write(EMAIL_KEY, email);
export const markSent = (now = Date.now()) => write(SENT_KEY, String(now));
export function forgetPending() {
  write(EMAIL_KEY, null);
  write(SENT_KEY, null);
}

/** Whole seconds left before another send is allowed. */
export function secondsLeft(sentAt: number, now: number): number {
  if (!sentAt) return 0;
  const left = Math.ceil((sentAt + RESEND_COOLDOWN_S * 1000 - now) / 1000);
  // A clock that jumped backwards mustn't lock the button for longer than the cooldown.
  return Math.min(RESEND_COOLDOWN_S, Math.max(0, left));
}
