import { eq, sql } from "drizzle-orm";
import { rolePermissions, roles, type DbOrTx } from "@app/db";
import { writeAudit } from "@app/server";
import { type Permission, SYSTEM_ROLE_REQUIRED_PERMISSIONS } from "@app/shared";

/**
 * Vai trò mặc định tạo bởi seed. Sau đó quản trị viên tự sửa trên giao diện; seed chạy lại KHÔNG ghi đè vai trò đã có
 * (chỉ tạo vai trò còn thiếu). Đổi DEFAULT_ROLES (thêm quyền cho module mới) thì chạy
 * `pnpm db:seed -- --sync-default-roles` để thêm quyền còn thiếu vào vai trò mặc định trên DB đã seed.
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
    description: "Lập phiếu, xem, duyệt và xuất Excel phiếu của phòng ban mình.",
    permissions: ["pr.create", "pr.view.department", "pr.approve.department", "pr.export"],
  },
  ACCOUNTANT: {
    name: "Kế toán",
    description: "Lập phiếu, xem và xuất Excel mọi phiếu.",
    permissions: ["pr.create", "pr.view.all", "pr.export"],
  },
  DIRECTOR: {
    name: "Giám đốc",
    description: "Xem và xuất Excel mọi phiếu, duyệt cấp cuối.",
    permissions: ["pr.view.all", "pr.approve.final", "pr.export"],
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

/**
 * Thêm vào vai trò mặc định ĐÃ CÓ các quyền mặc định còn thiếu (module mới thêm quyền sau khi DB đã seed). Chỉ thêm,
 * không bao giờ gỡ: quyền quản trị viên đã tự thêm hay tự gỡ khỏi vai trò được giữ nguyên ở lần sau (chỉ những quyền
 * mới so với lần đồng bộ trước mới được thêm lại nếu thiếu; quản trị muốn bỏ hẳn thì đổi tên vai trò hoặc sửa
 * DEFAULT_ROLES). Mỗi vai trò thay đổi được tăng version và ghi audit `role.sync_defaults`.
 */
export async function syncDefaultRolePermissions(
  db: DbOrTx,
): Promise<{ role: string; added: Permission[] }[]> {
  const changes: { role: string; added: Permission[] }[] = [];
  for (const def of Object.values(DEFAULT_ROLES)) {
    const [role] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(sql`lower(${roles.name}) = lower(${def.name})`);
    if (!role) continue; // chưa có thì ensureDefaultRoles tạo
    const added = await db
      .insert(rolePermissions)
      .values(def.permissions.map((permission) => ({ roleId: role.id, permission })))
      .onConflictDoNothing()
      .returning({ permission: rolePermissions.permission });
    if (added.length === 0) continue;
    await db
      .update(roles)
      .set({ version: sql`${roles.version} + 1` })
      .where(eq(roles.id, role.id));
    const list = added.map((a) => a.permission as Permission).sort();
    await writeAudit(db, {
      actorId: null,
      action: "role.sync_defaults",
      entityType: "role",
      entityId: role.id,
      after: { added: list },
    });
    changes.push({ role: def.name, added: list });
  }
  return changes;
}
