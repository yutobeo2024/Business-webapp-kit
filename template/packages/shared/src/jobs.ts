import { z } from "zod";
import { PR_STATUSES } from "./purchase-request.js";

export const QUEUES = {
  notifications: "notifications",
  /** Hàng đợi riêng, ít luồng: xuất file tốn RAM/CPU (Chromium), không được làm chậm thông báo. */
  exports: "exports",
  /** Nhập Excel: kiểm và ghi dữ liệu, chạy lần lượt. */
  imports: "imports",
} as const;

export const JOBS = {
  prStatusChanged: "pr.status_changed",
  exportRun: "export.run",
  notificationDeliver: "notification.deliver",
  importValidate: "import.validate",
  importCommit: "import.commit",
} as const;

export const importJobSchema = z.object({ importId: z.uuid() });
export type ImportJobPayload = z.infer<typeof importJobSchema>;

export const exportRunJobSchema = z.object({ exportId: z.uuid() });
export type ExportRunJob = z.infer<typeof exportRunJobSchema>;

export const notificationDeliverJobSchema = z.object({ deliveryId: z.uuid() });
export type NotificationDeliverJob = z.infer<typeof notificationDeliverJobSchema>;

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
