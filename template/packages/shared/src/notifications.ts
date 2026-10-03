/**
 * Danh mục thông báo (spec 003). Thông báo trong app luôn có; email và Zalo là kênh thêm, mỗi người tự bật/tắt.
 * Thêm loại thông báo: thêm một mục vào NOTIFICATION_TYPES + schema dữ liệu, rồi mẫu nội dung trong
 * `packages/server/src/notifications/templates.ts` (typecheck đỏ nếu quên) và nơi gọi `notify` trong worker.
 */
import { z } from "zod";
import { paginationQuerySchema } from "./api.js";

/** Kênh gửi ra ngoài. Trong app không nằm ở đây vì luôn bật. */
export const NOTIFICATION_CHANNELS = ["email", "zalo"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: "Email",
  zalo: "Zalo",
};

const prRef = {
  prId: z.uuid(),
  code: z.string().min(1),
  title: z.string(),
  totalAmount: z.number().int(),
  requesterName: z.string(),
};

/** Dữ liệu của từng loại: chỉ chứa thứ người nhận được xem (worker đã kiểm phạm vi xem trước khi gửi). */
export const NOTIFICATION_DATA_SCHEMAS = {
  "pr.pending_approval": z.object(prRef),
  "pr.approved": z.object(prRef),
  "pr.rejected": z.object({ ...prRef, reason: z.string() }),
};
export type NotificationType = keyof typeof NOTIFICATION_DATA_SCHEMAS;
export type NotificationData<T extends NotificationType> = z.infer<(typeof NOTIFICATION_DATA_SCHEMAS)[T]>;

export const NOTIFICATION_TYPES = {
  "pr.pending_approval": { label: "Phiếu đề nghị chờ bạn duyệt" },
  "pr.approved": { label: "Phiếu đề nghị của bạn đã được duyệt" },
  "pr.rejected": { label: "Phiếu đề nghị của bạn bị từ chối" },
} as const satisfies Record<NotificationType, { label: string }>;

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Đường dẫn trong app (bắt đầu bằng "/"), null nếu không có trang đích. */
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  unread: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
