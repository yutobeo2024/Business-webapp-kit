import { z } from "zod";
import { PR_STATUSES } from "./purchase-request.js";

export const QUEUES = {
  notifications: "notifications",
} as const;

export const JOBS = {
  prStatusChanged: "pr.status_changed",
} as const;

/** Payload job cũng là input ở biên (quy ước #2): API tạo theo type này, worker validate bằng schema trước khi xử lý. */
export const prStatusChangedJobSchema = z.object({
  purchaseRequestId: z.uuid(),
  code: z.string().min(1),
  from: z.enum(PR_STATUSES),
  to: z.enum(PR_STATUSES),
  actorId: z.uuid(),
  version: z.number().int().min(1),
});
export type PrStatusChangedJob = z.infer<typeof prStatusChangedJobSchema>;
