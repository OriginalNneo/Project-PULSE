import { broadcast } from "../gateway/ws.js";

export function notifyNewQueueEntry(queueId: string, emotionLabel: string, priorityScore: number): void {
  broadcast("new_queue_entry", { queueId, emotion_label: emotionLabel, priority_score: priorityScore });
}

export function notifyQueueUpdated(queueId: string, priorityScore: number): void {
  broadcast("queue_updated", { queueId, priority_score: priorityScore });
}

export function notifyOfficerAssigned(queueId: string, officerId: string): void {
  broadcast("officer_assigned", { queueId, officerId });
}

export function notifyCaseResolved(queueId: string): void {
  broadcast("case_resolved", { queueId });
}

export function notifyOfficerStatusChange(officerId: string, status: string): void {
  broadcast("officer_status_change", { officerId, status });
}
