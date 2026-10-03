/**
 * Tạo thông báo cho danh sách người nhận (spec 003). Gọi từ worker sau khi đã tính người nhận theo quyền HIỆN TẠI.
 * Idempotent: (người nhận, dedupeKey) là duy nhất, job chạy lại không tạo thông báo thứ hai.
 */
import { notifications, type DbOrTx } from "@app/db";
import { NOTIFICATION_DATA_SCHEMAS, type NotificationData, type NotificationType } from "@app/shared";
import { renderNotification } from "./templates.js";

export interface NotifyInput<T extends NotificationType> {
  type: T;
  userIds: readonly string[];
  data: NotificationData<T>;
  /** Định danh sự kiện, ví dụ `pr-<id>-v<version>`: cùng sự kiện thì không báo lần hai. */
  dedupeKey: string;
}

/** Trả id các thông báo VỪA tạo (bỏ qua người đã được báo cho sự kiện này). */
export async function notify<T extends NotificationType>(
  db: DbOrTx,
  input: NotifyInput<T>,
): Promise<string[]> {
  const userIds = [...new Set(input.userIds)];
  if (userIds.length === 0) return [];
  // Dữ liệu là input ở biên (đi qua job): kiểm lại trước khi dựng nội dung.
  const data = NOTIFICATION_DATA_SCHEMAS[input.type].parse(input.data) as NotificationData<T>;
  const content = renderNotification(input.type, data);
  const rows = await db
    .insert(notifications)
    .values(userIds.map((userId) => ({ userId, type: input.type, dedupeKey: input.dedupeKey, ...content })))
    .onConflictDoNothing({ target: [notifications.userId, notifications.dedupeKey] })
    .returning({ id: notifications.id });
  return rows.map((r) => r.id);
}
