// When the welcome-discount prompt and its corner teaser may show.
// Client-only, best-effort: without storage nothing shows rather than nagging.

const STATE_KEY = "wb-newsletter";
const VISIT_KEY = "wb-visit"; // sessionStorage: this browsing session
export const SUBSCRIBED_EVENT = "newsletter:subscribed";

// Closing the prompt doesn't end the offer: it comes back after a growing
// pause, and after the last one only the corner teaser is left.
const REPROMPT_AFTER_DAYS = [3, 14];
const TEASER_HIDDEN_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

type State = {
  subscribed?: boolean;
  // The prompt has opened at least once (closed or just left behind)
  seen?: boolean;
  dismissals?: number;
  lastDismissedAt?: number;
  teaserHiddenUntil?: number;
};

type Visit = { start: number; views: number; prompted?: boolean };

function readState(): State | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STATE_KEY);
  } catch {
    return null;
  }
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? (parsed as State) : {};
  } catch {
    // Unreadable value (e.g. an older format) — start over rather than hide forever
    return {};
  }
}

function writeState(patch: State) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({ ...readState(), ...patch }));
  } catch {}
}

export function isSubscribed(): boolean {
  return readState()?.subscribed === true;
}

export function markSubscribed() {
  writeState({ subscribed: true });
  window.dispatchEvent(new Event(SUBSCRIBED_EVENT));
}

/** Counts a close of the prompt that opened by itself. */
export function markDismissed() {
  const dismissals = (readState()?.dismissals ?? 0) + 1;
  writeState({ dismissals, lastDismissedAt: Date.now() });
}

export function hideTeaser() {
  writeState({ teaserHiddenUntil: Date.now() + TEASER_HIDDEN_DAYS * DAY_MS });
}

/** May the prompt open by itself in this session? */
export function promptAllowed(): boolean {
  const state = readState();
  if (!state || state.subscribed || readVisit()?.prompted) return false;
  const dismissals = state.dismissals ?? 0;
  if (dismissals === 0) return true;
  const pauseDays = REPROMPT_AFTER_DAYS[dismissals - 1];
  if (pauseDays === undefined) return false;
  return Date.now() - (state.lastDismissedAt ?? 0) >= pauseDays * DAY_MS;
}

/** The corner teaser stands in for the prompt once it has been closed. */
export function teaserAllowed(): boolean {
  const state = readState();
  // Also after a prompt left open and lost to a reload — the offer stays reachable
  if (!state || state.subscribed || !(state.dismissals || state.seen)) return false;
  return (state.teaserHiddenUntil ?? 0) < Date.now();
}

function readVisit(): Visit | null {
  try {
    const raw = sessionStorage.getItem(VISIT_KEY);
    return raw ? (JSON.parse(raw) as Visit) : null;
  } catch {
    return null;
  }
}

function writeVisit(visit: Visit) {
  try {
    sessionStorage.setItem(VISIT_KEY, JSON.stringify(visit));
  } catch {}
}

/** Counts this page view; returns the session's start time and view count. */
export function recordVisit(): Visit {
  const prev = readVisit();
  const visit = { ...prev, start: prev?.start ?? Date.now(), views: (prev?.views ?? 0) + 1 };
  writeVisit(visit);
  return visit;
}

/** At most one automatic prompt per session, reloads included. */
export function markPromptedThisSession() {
  const visit = readVisit();
  if (visit) writeVisit({ ...visit, prompted: true });
  writeState({ seen: true });
}
