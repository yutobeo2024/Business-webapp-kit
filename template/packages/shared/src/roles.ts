export const ROLES = ["STAFF", "MANAGER", "ACCOUNTANT", "DIRECTOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  STAFF: "Nhân viên",
  MANAGER: "Trưởng phòng",
  ACCOUNTANT: "Kế toán",
  DIRECTOR: "Giám đốc",
  ADMIN: "Quản trị hệ thống",
};
