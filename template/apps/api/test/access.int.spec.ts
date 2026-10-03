import type { INestApplication } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { auditLogs, rolePermissions, sessions, users, type DbHandle } from "@app/db";
import { createApp } from "../src/bootstrap.js";
import { hashPassword } from "../src/auth/crypto.js";
import {
  nextIp,
  openDb,
  resetDb,
  seedFixture,
  TEST_ORIGIN,
  TEST_PASSWORD,
  testEnv,
  type Fixture,
} from "./helpers.js";

let app: INestApplication;
let handle: DbHandle;
let f: Fixture;

beforeAll(async () => {
  handle = openDb();
  app = await createApp(testEnv(), { logger: false });
  await app.init();
});
afterAll(async () => {
  await app.close();
  await handle.close();
});
beforeEach(async () => {
  await resetDb(handle);
  f = await seedFixture(handle);
});

async function login(email: string, password = TEST_PASSWORD) {
  const a = request.agent(app.getHttpServer());
  const res = await a
    .post("/api/auth/login")
    .set("Origin", TEST_ORIGIN)
    .set("X-Forwarded-For", nextIp())
    .send({ email, password });
  expect(res.status).toBe(200);
  return a;
}
const newPr = { title: "Mua giấy in quý 4", items: [{ name: "Giấy", quantity: 1, unitPrice: 1000 }] };

describe("Phân quyền theo quyền, vai trò cấu hình trong DB", () => {
  it("me trả vai trò và quyền, không có tên vai trò cứng", async () => {
    const me = (await (await login(f.manager.email)).get("/api/auth/me")).body;
    expect(me.roles.map((r: { name: string }) => r.name)).toEqual(["Trưởng phòng"]);
    expect(me.permissions).toEqual(["pr.approve.department", "pr.create", "pr.view.department"]);
    expect(me.role).toBeUndefined();
  });

  it("thiếu quyền endpoint (@RequirePermission): 403", async () => {
    const res = await (
      await login(f.director.email)
    )
      .post("/api/purchase-requests")
      .set("Origin", TEST_ORIGIN)
      .send(newPr);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("gỡ quyền khỏi vai trò có hiệu lực ngay ở request kế tiếp, không cần đăng nhập lại", async () => {
    const a = await login(f.staff.email);
    expect((await a.post("/api/purchase-requests").set("Origin", TEST_ORIGIN).send(newPr)).status).toBe(201);
    await handle.db
      .delete(rolePermissions)
      .where(and(eq(rolePermissions.roleId, f.roleIds.STAFF), eq(rolePermissions.permission, "pr.create")));
    expect((await a.post("/api/purchase-requests").set("Origin", TEST_ORIGIN).send(newPr)).status).toBe(403);
  });

  it("quyền trong DB không còn trong danh mục (module đã gỡ) bị bỏ qua", async () => {
    await handle.db
      .insert(rolePermissions)
      .values({ roleId: f.roleIds.STAFF, permission: "module_da_go.lam_gi_do" });
    const me = (await (await login(f.staff.email)).get("/api/auth/me")).body;
    expect(me.permissions).toEqual(["pr.create"]);
  });
});

describe("Mật khẩu tạm và đổi mật khẩu", () => {
  const TEMP = "mat-khau-tam-123";
  const NEW = "mat-khau-moi-cua-toi-456";

  async function withTempPassword() {
    await handle.db
      .update(users)
      .set({ passwordHash: await hashPassword(TEMP), mustChangePassword: true })
      .where(eq(users.id, f.staff.id));
    return login(f.staff.email, TEMP);
  }

  it("đang dùng mật khẩu tạm: API nghiệp vụ trả 403, me và đổi mật khẩu vẫn dùng được", async () => {
    const a = await withTempPassword();
    const blocked = await a.get("/api/purchase-requests");
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("AUTH_PASSWORD_CHANGE_REQUIRED");
    const me = await a.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.mustChangePassword).toBe(true);
  });

  it("đổi mật khẩu xong thì làm việc bình thường, đăng nhập bằng mật khẩu mới", async () => {
    const a = await withTempPassword();
    const res = await a
      .post("/api/auth/change-password")
      .set("Origin", TEST_ORIGIN)
      .set("X-Forwarded-For", nextIp())
      .send({ currentPassword: TEMP, newPassword: NEW });
    expect(res.status).toBe(204);
    expect((await a.get("/api/purchase-requests")).status).toBe(200);
    await login(f.staff.email, NEW);
  });

  it("đổi mật khẩu thu hồi các phiên KHÁC, giữ phiên hiện tại", async () => {
    const other = await login(f.staff.email);
    const current = await login(f.staff.email);
    await current
      .post("/api/auth/change-password")
      .set("Origin", TEST_ORIGIN)
      .set("X-Forwarded-For", nextIp())
      .send({ currentPassword: TEST_PASSWORD, newPassword: NEW });
    expect((await other.get("/api/auth/me")).status).toBe(401);
    expect((await current.get("/api/auth/me")).status).toBe(200);
  });

  it("sai mật khẩu hiện tại, mật khẩu ngắn, mật khẩu chứa tên đăng nhập: bị từ chối", async () => {
    const a = await login(f.staff.email);
    const post = (body: object) =>
      a
        .post("/api/auth/change-password")
        .set("Origin", TEST_ORIGIN)
        .set("X-Forwarded-For", nextIp())
        .send(body);
    expect((await post({ currentPassword: "sai-roi-nhe", newPassword: NEW })).body.code).toBe(
      "AUTH_WRONG_PASSWORD",
    );
    expect((await post({ currentPassword: TEST_PASSWORD, newPassword: "ngan" })).body.code).toBe(
      "VALIDATION_FAILED",
    );
    expect((await post({ currentPassword: TEST_PASSWORD, newPassword: "staff-2026-abc" })).body.code).toBe(
      "AUTH_WEAK_PASSWORD",
    );
  });

  it("audit ghi việc đổi mật khẩu, không chứa mật khẩu hay mã băm", async () => {
    const a = await login(f.staff.email);
    await a
      .post("/api/auth/change-password")
      .set("Origin", TEST_ORIGIN)
      .set("X-Forwarded-For", nextIp())
      .send({ currentPassword: TEST_PASSWORD, newPassword: NEW });
    const rows = await handle.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, "auth.password_changed"));
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toMatch(/argon2|mat-khau/);
    expect(await handle.db.select().from(sessions).where(eq(sessions.userId, f.staff.id))).toHaveLength(1);
  });
});
