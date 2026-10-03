/**
 * Dữ liệu mẫu cho test tích hợp của worker (DB thật). Không build vào dist (tsconfig.build loại thư mục testing).
 */
import { sql } from "drizzle-orm";
import { departments, purchaseRequests, rolePermissions, roles, userRoles, users, type Db } from "@app/db";
import type { Permission, PrStatus } from "@app/shared";

/** Xóa sạch dữ liệu giữa các test, tạo hai phòng ban KD, KT. */
export async function resetWorkerDb(db: Db): Promise<{ deptKd: string; deptKt: string }> {
  await db.execute(
    sql`truncate table audit_logs, notification_deliveries, user_notification_settings, notifications, export_jobs, files, sessions, purchase_requests, user_roles, role_permissions, roles, users, departments restart identity cascade`,
  );
  const [kd] = await db.insert(departments).values({ code: "KD", name: "Kinh doanh" }).returning();
  const [kt] = await db.insert(departments).values({ code: "KT", name: "Kế toán" }).returning();
  return { deptKd: kd!.id, deptKt: kt!.id };
}

/** Người dùng có một vai trò riêng mang đúng các quyền cho trước. */
export async function makeUser(
  db: Db,
  name: string,
  departmentId: string | null,
  permissions: Permission[],
): Promise<{ id: string; roleId: string }> {
  const [role] = await db
    .insert(roles)
    .values({ name: `Vai trò ${name}` })
    .returning();
  if (permissions.length) {
    await db.insert(rolePermissions).values(permissions.map((p) => ({ roleId: role!.id, permission: p })));
  }
  const [u] = await db
    .insert(users)
    .values({ email: `${name}@test.vn`, fullName: name, departmentId, passwordHash: "x" })
    .returning();
  await db.insert(userRoles).values({ userId: u!.id, roleId: role!.id });
  return { id: u!.id, roleId: role!.id };
}

let seq = 0;
export async function makePr(
  db: Db,
  requesterId: string,
  departmentId: string,
  title: string,
  status: PrStatus = "DRAFT",
) {
  const [pr] = await db
    .insert(purchaseRequests)
    .values({
      code: `PR-2026-${String(++seq).padStart(6, "0")}`,
      title,
      items: [{ name: "Giấy A4 <loại 1>", quantity: 2, unitPrice: 90_000 }],
      totalAmount: 180_000,
      departmentId,
      requesterId,
      status,
    })
    .returning();
  return pr!;
}
