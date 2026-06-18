import { autoAssign } from "./queue.js";
import { notifyOfficerStatusChange } from "./notify.js";
import { createServiceLogger } from "../shared/logger.js";

const log = createServiceLogger("dashboard-officer");

export type OfficerStatus = "available" | "busy" | "break";

export interface OfficerState {
  officerId: string;
  status: OfficerStatus;
  current_queue_id: string | null;
  updated_at: string;
}

// In-memory officer registry (single api instance; replace with Redis for multi-instance)
const officers = new Map<string, OfficerState>();

export function getOfficerState(officerId: string): OfficerState | null {
  return officers.get(officerId) ?? null;
}

export function listOfficers(): OfficerState[] {
  return Array.from(officers.values());
}

export async function setOfficerStatus(officerId: string, status: OfficerStatus): Promise<OfficerState> {
  const existing = officers.get(officerId);
  const state: OfficerState = {
    officerId,
    status,
    current_queue_id: existing?.current_queue_id ?? null,
    updated_at: new Date().toISOString(),
  };
  officers.set(officerId, state);
  notifyOfficerStatusChange(officerId, status);

  if (status === "available") {
    const assigned = await autoAssign(officerId);
    if (assigned) {
      state.current_queue_id = assigned.queueId;
      state.status = "busy";
      officers.set(officerId, state);
    }
  }

  log.info({ officerId, status }, "Officer status updated");
  return officers.get(officerId)!;
}

export function markOfficerFree(officerId: string): void {
  const existing = officers.get(officerId);
  if (!existing) return;
  officers.set(officerId, { ...existing, current_queue_id: null, updated_at: new Date().toISOString() });
}
