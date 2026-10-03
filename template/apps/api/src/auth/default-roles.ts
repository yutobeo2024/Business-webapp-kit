import { eq, sql } from "drizzle-orm";
import { rolePermissions, roles, type DbOrTx } from "@app/db";
import { type Permission, SYSTEM_ROLE_REQUIRED_PERMISSIONS } from "@app/shared";

/**
 * Vai trò mặc định tạo bởi seed. Sau đó quản trị viên tự sửa trên giao diện; seed chạy lại KHÔNG ghi đè vai trò đã có
 * (chỉ tạo vai trò còn thiếu). Đổi theo spec của khách: đây là cấu hình mẫu cho module phiếu đề nghị.
 */
export const DEFAULT_ROLES = {
  ADMIN: {
    name: "Quản trị hệ thống",
    description: "Quản lý tài khoản, vai trò, phòng ban. Không tham gia nghiệp vụ (tách biệt nhiệm vụ).",
    isSystem: true,
    permissions: [...SYSTEM_ROLE_REQUIRED_PERMISSIONS, "departments.manage"],
  },
  STAFF: { name: "Nhân viên", description: "Lập phiếu, xem phiếu của mình.", permissions: ["pr.create"] },
  MANAGER: {
    name: "Trưởng phòng",
    description: "Lập phiếu, xem và duyệt phiếu của phòng ban mình.",
    permissions: ["pr.create", "pr.view.department", "pr.approve.department"],
  },
  ACCOUNTANT: {
    name: "Kế toán",
    description: "Lập phiếu, xem mọi phiếu.",
    permissions: ["pr.create", "pr.view.all"],
  },
  DIRECTOR: {
    name: "Giám đốc",
    description: "Xem mọi phiếu, duyệt cấp cuối.",
    permissions: ["pr.view.all", "pr.approve.final"],
  },
} as const satisfies Record<
  string,
  { name: string; description: string; isSystem?: boolean; permissions: readonly Permission[] }
>;
export type DefaultRoleKey = keyof typeof DEFAULT_ROLES;

/** Tạo vai trò mặc định còn thiếu (theo tên). Trả id theo khóa. Idempotent. */
export async function ensureDefaultRoles(db: DbOrTx): Promise<Record<DefaultRoleKey, string>> {
  const ids = {} as Record<DefaultRoleKey, string>;
  for (const [key, def] of Object.entries(DEFAULT_ROLES) as [
    DefaultRoleKey,
    (typeof DEFAULT_ROLES)[DefaultRoleKey],
  ][]) {
    const [existing] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(sql`lower(${roles.name}) = lower(${def.name})`);
    if (existing) {
      ids[key] = existing.id;
      continue;
    }
    const [created] = await db
      .insert(roles)
      .values({ name: def.name, description: def.description, isSystem: "isSystem" in def && def.isSystem })
      .returning({ id: roles.id });
    if (!created) throw new Error(`Không tạo được vai trò ${def.name}`);
    await db
      .insert(rolePermissions)
      .values(def.permissions.map((permission) => ({ roleId: created.id, permission })));
    ids[key] = created.id;
  }
  // Chỉ một vai trò hệ thống.
  const systemRoles = await db.select({ id: roles.id }).from(roles).where(eq(roles.isSystem, true));
  if (systemRoles.length !== 1)
    throw new Error(`Phải có đúng 1 vai trò hệ thống, đang có ${systemRoles.length}`);
  return ids;
}
