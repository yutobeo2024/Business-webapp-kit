/**
 * Nội dung từng loại thông báo. Mỗi loại PHẢI có đủ mẫu (typecheck đỏ nếu thiếu): dòng tiêu đề + nội dung ngắn cho
 * thông báo trong app, đường dẫn trang đích. Không đưa vào nội dung thứ người nhận không được xem.
 */
import { formatVnd, type NotificationData, type NotificationType } from "@app/shared";

export interface RenderedNotification {
  title: string;
  body: string;
  /** Đường dẫn trong app, bắt đầu bằng "/". */
  link: string | null;
}

type Template<T extends NotificationType> = (data: NotificationData<T>) => RenderedNotification;

const prLink = (code: string) => `/?q=${encodeURIComponent(code)}`;

export const NOTIFICATION_TEMPLATES: { [T in NotificationType]: Template<T> } = {
  "pr.pending_approval": (d) => ({
    title: `Phiếu ${d.code} chờ bạn duyệt`,
    body: `${d.requesterName} đề nghị: ${d.title} (${formatVnd(d.totalAmount)}).`,
    link: prLink(d.code),
  }),
  "pr.approved": (d) => ({
    title: `Phiếu ${d.code} đã được duyệt`,
    body: `${d.title} (${formatVnd(d.totalAmount)}) đã được duyệt.`,
    link: prLink(d.code),
  }),
  "pr.rejected": (d) => ({
    title: `Phiếu ${d.code} bị từ chối`,
    body: `${d.title}. Lý do: ${d.reason}`,
    link: prLink(d.code),
  }),
};

export function renderNotification<T extends NotificationType>(
  type: T,
  data: NotificationData<T>,
): RenderedNotification {
  return NOTIFICATION_TEMPLATES[type](data);
}
