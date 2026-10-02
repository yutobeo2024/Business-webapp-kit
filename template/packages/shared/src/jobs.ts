import type { PrStatus } from "./purchase-request.js";

export const QUEUES = {
  notifications: "notifications",
} as const;

export const JOBS = {
  prStatusChanged: "pr.status_changed",
} as const;

export interface PrStatusChangedJob {
  purchaseRequestId: string;
  code: string;
  from: PrStatus;
  to: PrStatus;
  actorId: string;
  version: number;
}
