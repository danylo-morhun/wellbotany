// What the admin dashboard says about the Subiekt agent. Pure — inputs are passed in.
import { heartbeatProblem } from "./heartbeat";

export type SyncProblem = "silent" | "error" | null;

/**
 * Silence comes from the Redis heartbeat, which every agent request sets
 * (shop hours and holidays as in the uptime check). SyncRun can't tell: it is
 * written only when a snapshot reaches Postgres, which unchanged ones don't.
 */
export function syncProblem(
  lastBeat: string | null,
  lastRun: { error: string | null } | null,
  now: Date,
): SyncProblem {
  if (heartbeatProblem(lastBeat, now)) return "silent";
  return lastRun?.error ? "error" : null;
}
