import {
  getQueue,
  getQueueStats,
  assignQueueEntry,
  updateQueuePriority,
  type QueueEntry,
  type QueueStats,
} from "../db/proxy-client.js";
import { notifyQueueUpdated, notifyOfficerAssigned } from "./notify.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("dashboard-queue");

// emotion_score is capped at 80; wait_time_boost is capped at 20 → max 100
export function computePriorityScore(emotionScore: number, minutesWaiting: number): number {
  const emotionCapped = Math.min(emotionScore, 80);
  const waitBoost = Math.min(minutesWaiting * 0.5, 20);
  return Math.round(emotionCapped + waitBoost);
}

// Re-score all "waiting" entries based on current wait time, then write back
async function refreshQueuePriorities(): Promise<void> {
  const queue = await getQueue();
  if (!queue) return;

  const now = Date.now();
  const waiting = queue.filter((e) => e.status === "waiting");

  await Promise.all(
    waiting.map(async (entry) => {
      const minutesWaiting = (now - new Date(entry.created_at).getTime()) / 60_000;
      const newScore = computePriorityScore(entry.emotion_score, minutesWaiting);
      if (newScore !== entry.priority_score) {
        await updateQueuePriority(entry.queueId, newScore);
        notifyQueueUpdated(entry.queueId, newScore);
      }
    }),
  );
}

// Call this once when the api container starts; returns a handle to clear the timer
export function startQueueRefreshTimer(intervalMs = 30_000): ReturnType<typeof setInterval> {
  log.info({ intervalMs }, "Queue priority refresh timer started");
  return setInterval(() => {
    refreshQueuePriorities().catch((err: unknown) => {
      log.warn({ msg: (err as Error).message }, "Queue priority refresh skipped (db-proxy unreachable)");
    });
  }, intervalMs);
}

// Assign the highest-priority waiting entry to an officer
export async function autoAssign(officerId: string): Promise<QueueEntry | null> {
  const queue = await getQueue();
  if (!queue) return null;

  const top = queue.find((e) => e.status === "waiting");
  if (!top) {
    log.info({ officerId }, "No waiting entries for auto-assign");
    return null;
  }

  const assigned = await assignQueueEntry(top.queueId, officerId);
  if (!assigned) return null;

  notifyOfficerAssigned(top.queueId, officerId);
  log.info({ queueId: top.queueId, officerId }, "Auto-assigned queue entry");
  return assigned;
}

export type { QueueEntry, QueueStats };
