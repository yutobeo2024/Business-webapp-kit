import { z } from "zod";
import { PR_PERMISSIONS } from "./purchase-request.js";

/**
 * Danh mục QUYỀN của hệ thống. Quyền khai báo trong mã (vì chỉ có nghĩa khi có mã thực thi nó); VAI TRÒ là tập quyền do
 * quản trị viên cấu hình trên giao diện và lưu trong DB (ADR-0004).
 *
 * Mã kiểm quyền bằng `can(user, "...")`, KHÔNG BAO GIỜ kiểm tên vai trò.
 * Module mới: khai báo `XXX_PERMISSIONS` trong file shared của module (xem `PR_PERMISSIONS`) rồi thêm vào `PERMISSIONS`
 * dưới đây; quyền tự xuất hiện trong màn chỉnh vai trò.
 */
export interface PermissionDef {
  /** Nhóm hiển thị trên màn chỉnh vai trò. */
  group: string;
  /** Mô tả tiếng Việt, nói rõ quyền cho phép làm gì. */
  label: string;
}

export const CORE_PERMISSIONS = {
  "users.manage": {
    group: "Quản trị hệ thống",
    label: "Quản lý người dùng: tạo, sửa, khóa tài khoản, đặt lại mật khẩu",
  },
  "roles.manage": { group: "Quản trị hệ thống", label: "Quản lý vai trò và quyền" },
  "departments.manage": { group: "Quản trị hệ thống", label: "Quản lý phòng ban" },
} as const satisfies Record<string, PermissionDef>;

export const PERMISSIONS = {
  ...CORE_PERMISSIONS,
  ...PR_PERMISSIONS,
} as const satisfies Record<string, PermissionDef>;

export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as [Permission, ...Permission[]];
export const permissionSchema = z.enum(PERMISSION_KEYS, "Quyền không tồn tại");

export function isPermission(value: string): value is Permission {
  return Object.hasOwn(PERMISSIONS, value);
}

/** Người dùng có quyền này không. Dùng chung cho backend (quyết định thật) và frontend (ẩn/hiện nút). */
export function can(
  user: { permissions: readonly string[] } | null | undefined,
  permission: Permission,
): boolean {
  return Boolean(user?.permissions.includes(permission));
}

/** Quyền của vai trò hệ thống "Quản trị hệ thống": luôn có, không gỡ được (tránh tự khóa mình ra khỏi hệ thống). */
export const SYSTEM_ROLE_REQUIRED_PERMISSIONS: readonly Permission[] = ["users.manage", "roles.manage"];

/** Danh mục theo nhóm, để vẽ màn chỉnh vai trò. */
export function permissionGroups(): { group: string; items: { key: Permission; label: string }[] }[] {
  const groups = new Map<string, { key: Permission; label: string }[]>();
  for (const key of PERMISSION_KEYS) {
    const def: PermissionDef = PERMISSIONS[key];
    groups.set(def.group, [...(groups.get(def.group) ?? []), { key, label: def.label }]);
  }
  return [...groups].map(([group, items]) => ({ group, items }));
}
