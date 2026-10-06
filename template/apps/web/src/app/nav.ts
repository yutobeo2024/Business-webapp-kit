import {
  Building2,
  ClipboardList, // sample
  Download,
  LayoutDashboard,
  type LucideIcon,
  ShieldCheck,
  Users,
} from "lucide-react";
import { can, type Permission } from "@app/shared";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /**
   * Chỉ hiện khi người dùng có quyền này, hoặc có MỘT trong danh sách quyền (ví dụ hộp "Chờ tôi xử lý" cho mọi người
   * duyệt). Không ghi: ai đăng nhập cũng thấy. Quyền thật do backend kiểm ở từng endpoint.
   */
  permission?: Permission | readonly Permission[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Menu bên trái, chia nhóm. Module nghiệp vụ mới thêm mục của mình vào nhóm "Nghiệp vụ". */
export const NAV: NavGroup[] = [
  { label: "Tổng quan", items: [{ to: "/", label: "Trang chủ", icon: LayoutDashboard }] },
  {
    label: "Nghiệp vụ",
    items: [
      { to: "/purchase-requests", label: "Phiếu đề nghị", icon: ClipboardList }, // sample
      { to: "/exports", label: "Tệp đã xuất", icon: Download },
    ],
  },
  {
    label: "Quản trị",
    items: [
      { to: "/admin/users", label: "Người dùng", icon: Users, permission: "users.manage" },
      { to: "/admin/roles", label: "Vai trò", icon: ShieldCheck, permission: "roles.manage" },
      { to: "/admin/departments", label: "Phòng ban", icon: Building2, permission: "departments.manage" },
    ],
  },
];

type Viewer = { permissions: readonly string[] } | null | undefined;

const allowed = (me: Viewer, permission: NavItem["permission"]) =>
  !permission || (typeof permission === "string" ? [permission] : permission).some((p) => can(me, p));

/** Các nhóm và mục người dùng được thấy; nhóm không còn mục nào thì bỏ. */
export function filterNav(groups: readonly NavGroup[], me: Viewer): NavGroup[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => allowed(me, i.permission)) }))
    .filter((g) => g.items.length > 0);
}

export const visibleNav = (me: Viewer): NavGroup[] => filterNav(NAV, me);
