import { z } from "zod";
import { PR_STATUSES } from "./purchase-request.js";

export const QUEUES = {
  notifications: "notifications",
  /** Hàng đợi riêng, ít luồng: xuất file tốn RAM/CPU (Chromium), không được làm chậm thông báo. */
  exports: "exports",
} as const;

export const JOBS = {
  prStatusChanged: "pr.status_changed",
  exportRun: "export.run",
} as const;

export const exportRunJobSchema = z.object({ exportId: z.uuid() });
export type ExportRunJob = z.infer<typeof exportRunJobSchema>;

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
