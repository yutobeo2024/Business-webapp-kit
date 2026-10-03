import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DbHandle } from "@app/db";
import { notify } from "@app/server";
import { createApp } from "../src/bootstrap.js";
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

type Agent = ReturnType<typeof request.agent>;
async function login(email: string): Promise<Agent> {
  const a = request.agent(app.getHttpServer());
  const res = await a
    .post("/api/auth/login")
    .set("Origin", TEST_ORIGIN)
    .set("X-Forwarded-For", nextIp())
    .send({ email, password: TEST_PASSWORD });
  expect(res.status).toBe(200);
  return a;
}

const data = (code: string) => ({
  prId: "8c5f0a52-6f1c-4b6e-9d0a-2f1f5a7f3c11",
  code,
  title: "Mua giấy",
  totalAmount: 90_000,
  requesterName: "Nhân viên A",
});

describe("thông báo trong app (spec 003)", () => {
  it("chỉ thấy của mình; đếm chưa đọc; đánh dấu đọc một và tất cả", async () => {
    for (const code of ["PR-1", "PR-2"]) {
      await notify(handle.db, {
        type: "pr.pending_approval",
        userIds: [f.manager.id],
        data: data(code),
        dedupeKey: code,
      });
    }
    await notify(handle.db, {
      type: "pr.approved",
      userIds: [f.staff.id],
      data: data("PR-3"),
      dedupeKey: "x",
    });

    const manager = await login(f.manager.email);
    const list = await manager.get("/api/notifications");
    expect(list.body.total).toBe(2);
    expect(list.body.items[0]).toMatchObject({ title: "Phiếu PR-2 chờ bạn duyệt", readAt: null });
    expect((await manager.get("/api/notifications/unread-count")).body).toEqual({ count: 2 });

    const first = list.body.items[0].id as string;
    const read = await manager.post(`/api/notifications/${first}/read`).set("Origin", TEST_ORIGIN);
    expect(read.status).toBe(200);
    expect(read.body.readAt).not.toBeNull();
    expect((await manager.get("/api/notifications?unread=true")).body.total).toBe(1);
    expect((await manager.post("/api/notifications/read-all").set("Origin", TEST_ORIGIN)).body).toEqual({
      updated: 1,
    });
    expect((await manager.get("/api/notifications/unread-count")).body).toEqual({ count: 0 });

    // Người khác: không thấy, không đánh dấu được thông báo của trưởng phòng.
    const staff = await login(f.staff.email);
    expect((await staff.get("/api/notifications")).body.total).toBe(1);
    expect((await staff.post(`/api/notifications/${first}/read`).set("Origin", TEST_ORIGIN)).status).toBe(
      404,
    );
  });

  it("đánh dấu đọc phải qua kiểm Origin (chống CSRF); tham số sai: 400", async () => {
    const manager = await login(f.manager.email);
    expect((await manager.post("/api/notifications/read-all")).status).toBe(403);
    expect((await manager.get("/api/notifications?unread=yes")).status).toBe(400);
  });
});

describe("cài đặt kênh và số điện thoại (spec 003)", () => {
  it("mặc định bật; tắt email được lưu; Zalo chưa bật ở hệ thống thì báo lý do", async () => {
    const staff = await login(f.staff.email);
    const first = await staff.get("/api/account/notification-settings");
    expect(first.body).toEqual([
      { channel: "email", enabled: true, available: true, unavailableReason: null },
      { channel: "zalo", enabled: true, available: false, unavailableReason: "Hệ thống chưa bật Zalo" },
    ]);
    const put = await staff
      .put("/api/account/notification-settings")
      .set("Origin", TEST_ORIGIN)
      .send({ email: false, zalo: true });
    expect(put.status).toBe(200);
    expect(put.body[0]).toMatchObject({ channel: "email", enabled: false });
    expect((await staff.get("/api/account/notification-settings")).body[0].enabled).toBe(false);
    expect(
      (await staff.put("/api/account/notification-settings").set("Origin", TEST_ORIGIN).send({ email: "no" }))
        .status,
    ).toBe(400);
  });

  it("quản trị nhập số điện thoại: lưu dạng chuẩn 84..., số sai bị 400 với câu tiếng Việt", async () => {
    const admin = await login(f.admin.email);
    const base = {
      email: "co.sdt@test.vn",
      fullName: "Có Số",
      departmentId: f.deptKd,
      roleIds: [f.roleIds.STAFF],
      temporaryPassword: "mat-khau-tam-2026",
    };
    const bad = await admin
      .post("/api/admin/users")
      .set("Origin", TEST_ORIGIN)
      .send({ ...base, phone: "0243 826 1234" });
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toContain("Số điện thoại di động không hợp lệ");

    const ok = await admin
      .post("/api/admin/users")
      .set("Origin", TEST_ORIGIN)
      .send({ ...base, phone: "0912 345 678" });
    expect(ok.status).toBe(201);
    expect(ok.body.phone).toBe("84912345678");

    // Sửa không gửi phone: giữ số cũ; gửi rỗng: xóa số.
    const keep = await admin
      .patch(`/api/admin/users/${ok.body.id}`)
      .set("Origin", TEST_ORIGIN)
      .send({
        fullName: "Có Số",
        departmentId: f.deptKd,
        roleIds: [f.roleIds.STAFF],
        version: ok.body.version,
      });
    expect(keep.body.phone).toBe("84912345678");
    const cleared = await admin
      .patch(`/api/admin/users/${ok.body.id}`)
      .set("Origin", TEST_ORIGIN)
      .send({
        fullName: "Có Số",
        phone: "",
        departmentId: f.deptKd,
        roleIds: [f.roleIds.STAFF],
        version: keep.body.version,
      });
    expect(cleared.body.phone).toBeNull();
  });
});
