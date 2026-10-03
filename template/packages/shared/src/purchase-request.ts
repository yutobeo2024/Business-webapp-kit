import { z } from "zod";
import { paginationQuerySchema } from "./api.js";
import { isValidVnd, vndSchema } from "./money.js";
import type { Role } from "./roles.js";

/** Ngưỡng tổng tiền (VND) phải qua Giám đốc duyệt. Xem BR-03 trong docs/specs/001-phieu-de-nghi-mua-hang.md */
export const DIRECTOR_APPROVAL_THRESHOLD_VND = 20_000_000;

export const PR_STATUSES = [
  "DRAFT",
  "PENDING_MANAGER",
  "PENDING_DIRECTOR",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export type PrStatus = (typeof PR_STATUSES)[number];

export const PR_STATUS_LABELS: Record<PrStatus, string> = {
  DRAFT: "Nháp",
  PENDING_MANAGER: "Chờ trưởng phòng duyệt",
  PENDING_DIRECTOR: "Chờ giám đốc duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  CANCELLED: "Đã hủy",
};

export const PR_EVENTS = [
  "SUBMIT",
  "MANAGER_APPROVE",
  "DIRECTOR_APPROVE",
  "REJECT",
  "REVISE",
  "CANCEL",
] as const;
export type PrEvent = (typeof PR_EVENTS)[number];

export const PR_EVENT_LABELS: Record<PrEvent, string> = {
  SUBMIT: "Gửi duyệt",
  MANAGER_APPROVE: "Trưởng phòng duyệt",
  DIRECTOR_APPROVE: "Giám đốc duyệt",
  REJECT: "Từ chối",
  REVISE: "Sửa lại",
  CANCEL: "Hủy phiếu",
};

export const prItemSchema = z.object({
  name: z.string().trim().min(1, "Tên hàng không được trống").max(200),
  quantity: z.number().int().min(1, "Số lượng tối thiểu là 1").max(1_000_000),
  unitPrice: vndSchema,
});
export type PrItem = z.infer<typeof prItemSchema>;

export const createPurchaseRequestSchema = z.object({
  title: z.string().trim().min(5, "Tiêu đề tối thiểu 5 ký tự").max(200),
  // Kiểm tổng ở field items (không phải cả object) để schema vẫn .extend() được.
  items: z
    .array(prItemSchema)
    .min(1, "Phiếu phải có ít nhất 1 dòng hàng")
    .max(50)
    .refine((items) => isValidVnd(calcTotal(items)), "Tổng tiền vượt giới hạn cho phép"),
  note: z.string().trim().max(2000).optional(),
});
export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;

/** Sửa phiếu nháp: nội dung như lúc tạo, kèm phiên bản đang xem (BR-06). */
export const updatePurchaseRequestSchema = createPurchaseRequestSchema.extend({
  version: z.number().int().min(1),
});
export type UpdatePurchaseRequestInput = z.infer<typeof updatePurchaseRequestSchema>;

/** BR-08: vai trò được lập phiếu. Giám đốc là người duyệt cuối, Quản trị không tham gia nghiệp vụ. */
export const PR_CREATOR_ROLES: readonly Role[] = ["STAFF", "MANAGER", "ACCOUNTANT"];

export const transitionPurchaseRequestSchema = z
  .object({
    event: z.enum(PR_EVENTS),
    /** Phiên bản phiếu client đang xem, dùng cho optimistic lock (BR-06). */
    version: z.number().int().min(1),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.event !== "REJECT" || (v.reason?.length ?? 0) >= 10, {
    message: "Lý do từ chối tối thiểu 10 ký tự",
    path: ["reason"],
  });
export type TransitionPurchaseRequestInput = z.infer<typeof transitionPurchaseRequestSchema>;

export const listPurchaseRequestsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PR_STATUSES).optional(),
});
export type ListPurchaseRequestsQuery = z.infer<typeof listPurchaseRequestsQuerySchema>;

export interface PurchaseRequestDto {
  id: string;
  code: string;
  title: string;
  status: PrStatus;
  totalAmount: number;
  items: PrItem[];
  note: string | null;
  rejectReason: string | null;
  requesterId: string;
  requesterName: string;
  departmentId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Các sự kiện người dùng hiện tại được phép thực hiện, để UI hiển thị nút. Quyền thật do backend kiểm tra. */
  allowedEvents: PrEvent[];
}

/** Không ném lỗi (form gọi khi đang gõ); kết quả phải qua isValidVnd trước khi lưu, schema đã làm việc đó. */
export function calcTotal(items: PrItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
}
