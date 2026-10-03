import { sql } from "drizzle-orm";
import { createDb, departments, userRoles, users, type DbHandle } from "@app/db";
import type { CurrentUser } from "@app/shared";
import { loadAccess } from "../src/auth/access.js";
import { hashPassword } from "../src/auth/crypto.js";
import { type DefaultRoleKey, ensureDefaultRoles } from "../src/auth/default-roles.js";
import type { Env } from "../src/config/env.js";

export const TEST_PASSWORD = "mat-khau-test-123";
export const TEST_ORIGIN = "http://app.test";

let ipCounter = 0;
/** IP giả khác nhau cho mỗi lần gọi, đi qua X-Forwarded-For (app tin 1 proxy như sau Caddy). */
export const nextIp = (): string => `10.0.${Math.floor(++ipCounter / 250)}.${(ipCounter % 250) + 1}`;

export function testEnv(): Env {
  return {
    NODE_ENV: "test",
    PORT: 0,
    APP_ORIGIN: TEST_ORIGIN,
    DATABASE_URL: process.env.DATABASE_URL!,
    REDIS_URL: process.env.REDIS_URL!,
    SESSION_TTL_HOURS: 12,
    SESSION_MAX_DAYS: 7,
    LOG_LEVEL: "error",
    TRUST_PROXY_HOPS: 1,
    DB_POOL_MAX: 5,
  };
}

export const openDb = (): DbHandle => createDb(process.env.DATABASE_URL!, { max: 5, appName: "test" });

export async function resetDb(handle: DbHandle): Promise<void> {
  await handle.db.execute(
    sql`truncate table audit_logs, sessions, purchase_requests, user_roles, role_permissions, roles, users, departments restart identity cascade`,
  );
}

export interface Fixture {
  deptKd: string;
  deptKt: string;
  staff: CurrentUser;
  staff2: CurrentUser;
  manager: CurrentUser;
  managerKt: CurrentUser;
  director: CurrentUser;
  accountant: CurrentUser;
  admin: CurrentUser;
  roleIds: Record<DefaultRoleKey, string>;
}

export async function seedFixture(handle: DbHandle): Promise<Fixture> {
  const { db } = handle;
  const [kd] = await db.insert(departments).values({ code: "KD", name: "Kinh doanh" }).returning();
  const [kt] = await db.insert(departments).values({ code: "KT", name: "Kế toán" }).returning();
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const roleIds = await ensureDefaultRoles(db);
  const mk = async (
    email: string,
    fullName: string,
    role: DefaultRoleKey,
    departmentId: string | null,
  ): Promise<CurrentUser> => {
    const [u] = await db.insert(users).values({ email, fullName, departmentId, passwordHash }).returning();
    await db.insert(userRoles).values({ userId: u!.id, roleId: roleIds[role] });
    return {
      id: u!.id,
      email: u!.email,
      fullName: u!.fullName,
      departmentId: u!.departmentId,
      mustChangePassword: false,
      ...(await loadAccess(db, u!.id)),
    };
  };
  return {
    deptKd: kd!.id,
    deptKt: kt!.id,
    staff: await mk("staff@test.vn", "Nhân viên A", "STAFF", kd!.id),
    staff2: await mk("staff2@test.vn", "Nhân viên B", "STAFF", kd!.id),
    manager: await mk("manager@test.vn", "Trưởng phòng KD", "MANAGER", kd!.id),
    managerKt: await mk("manager-kt@test.vn", "Trưởng phòng KT", "MANAGER", kt!.id),
    director: await mk("director@test.vn", "Giám đốc", "DIRECTOR", null),
    accountant: await mk("accountant@test.vn", "Kế toán", "ACCOUNTANT", kt!.id),
    admin: await mk("admin@test.vn", "Quản trị", "ADMIN", null),
    roleIds,
  };
}
