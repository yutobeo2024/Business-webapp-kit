import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DbHandle } from "@app/db";
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

const agent = () => request.agent(app.getHttpServer());

async function login(email: string) {
  const a = agent();
  const res = await a
    .post("/api/auth/login")
    .set("Origin", TEST_ORIGIN)
    .set("X-Forwarded-For", nextIp())
    .send({ email, password: TEST_PASSWORD });
  expect(res.status).toBe(200);
  return a;
}

describe("HTTP API (app thật, DB + Redis thật)", () => {
  it("health trả 200 khi DB và Redis sẵn sàng", async () => {
    const res = await agent().get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", checks: { database: "ok", redis: "ok" } });
  });

  it("endpoint mặc định yêu cầu đăng nhập", async () => {
    const res = await agent().get("/api/purchase-requests");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("cookie phiên là httpOnly và SameSite=Lax", async () => {
    const res = await agent()
      .post("/api/auth/login")
      .set("Origin", TEST_ORIGIN)
      .set("X-Forwarded-For", nextIp())
      .send({ email: f.staff.email, password: TEST_PASSWORD });
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/sid=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("sai mật khẩu trả thông báo chung, không lộ email có tồn tại hay không", async () => {
    const a = await agent()
      .post("/api/auth/login")
      .set("Origin", TEST_ORIGIN)
      .set("X-Forwarded-For", nextIp())
      .send({ email: f.staff.email, password: "sai-mat-khau" });
    const b = await agent()
      .post("/api/auth/login")
      .set("Origin", TEST_ORIGIN)
      .set("X-Forwarded-For", nextIp())
      .send({ email: "khong-ton-tai@test.vn", password: "sai-mat-khau" });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });

  it("khóa tài khoản sau 5 lần sai", async () => {
    for (let i = 0; i < 5; i++) {
      await agent()
        .post("/api/auth/login")
        .set("Origin", TEST_ORIGIN)
        .set("X-Forwarded-For", nextIp())
        .send({ email: f.staff.email, password: "sai-mat-khau" });
    }
    const res = await agent()
      .post("/api/auth/login")
      .set("Origin", TEST_ORIGIN)
      .set("X-Forwarded-For", nextIp())
      .send({ email: f.staff.email, password: TEST_PASSWORD });
    expect(res.status).toBe(423);
  });

  it("CSRF: request ghi không có Origin hợp lệ bị chặn", async () => {
    const a = await login(f.staff.email);
    const res = await a.post("/api/purchase-requests").set("Origin", "https://evil.example").send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CSRF_REJECTED");
  });

  it("validate input trả 400 với chi tiết tiếng Việt", async () => {
    const a = await login(f.staff.email);
    const res = await a
      .post("/api/purchase-requests")
      .set("Origin", TEST_ORIGIN)
      .send({ title: "abc", items: [] });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(JSON.stringify(res.body.details)).toContain("Tiêu đề tối thiểu 5 ký tự");
  });

  it("luồng tạo -> gửi -> duyệt qua HTTP", async () => {
    const staff = await login(f.staff.email);
    const created = await staff
      .post("/api/purchase-requests")
      .set("Origin", TEST_ORIGIN)
      .send({
        title: "Mua máy chiếu phòng họp",
        items: [{ name: "Máy chiếu", quantity: 1, unitPrice: 15_000_000 }],
      });
    expect(created.status).toBe(201);
    expect(created.body.allowedEvents).toEqual(["SUBMIT", "CANCEL"]);

    const submitted = await staff
      .post(`/api/purchase-requests/${created.body.id}/transitions`)
      .set("Origin", TEST_ORIGIN)
      .send({ event: "SUBMIT", version: 1 });
    expect(submitted.status).toBe(201);

    const manager = await login(f.manager.email);
    const approved = await manager
      .post(`/api/purchase-requests/${created.body.id}/transitions`)
      .set("Origin", TEST_ORIGIN)
      .send({ event: "MANAGER_APPROVE", version: 2 });
    expect(approved.status).toBe(201);
    expect(approved.body.status).toBe("APPROVED");
  });

  it("id sai định dạng trả 400, không phải 500", async () => {
    const a = await login(f.staff.email);
    const res = await a.get("/api/purchase-requests/khong-phai-uuid");
    expect(res.status).toBe(400);
  });

  it("rate limit đăng nhập: quá 10 lần/phút từ cùng một IP bị chặn 429", async () => {
    const ip = nextIp();
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await agent()
        .post("/api/auth/login")
        .set("Origin", TEST_ORIGIN)
        .set("X-Forwarded-For", ip)
        .send({ email: "khong-ton-tai@test.vn", password: "sai-mat-khau" });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("đăng xuất xóa phiên", async () => {
    const a = await login(f.staff.email);
    expect((await a.post("/api/auth/logout").set("Origin", TEST_ORIGIN)).status).toBe(204);
    expect((await a.get("/api/auth/me")).status).toBe(401);
  });
});
