// Chạy: node --test scripts/check-migrations.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { findUnmarkedDestructive } from "./check-migrations.mjs";

test("thêm bảng, thêm cột nullable, thêm index là an toàn", () => {
  const sql = `CREATE TABLE "orders" ("id" uuid PRIMARY KEY);
ALTER TABLE "users" ADD COLUMN "phone" text;
CREATE INDEX IF NOT EXISTS "orders_idx" ON "orders" ("id");`;
  assert.deepEqual(findUnmarkedDestructive(sql), []);
});

test("xóa cột, đổi tên, NOT NULL, đổi kiểu bị bắt", () => {
  assert.deepEqual(findUnmarkedDestructive('ALTER TABLE "users" DROP COLUMN "phone";'), ["DROP COLUMN"]);
  assert.deepEqual(findUnmarkedDestructive('ALTER TABLE "users" RENAME COLUMN "a" TO "b";'), ["RENAME"]);
  assert.deepEqual(findUnmarkedDestructive('ALTER TABLE "users" ALTER COLUMN "a" SET NOT NULL;'), [
    "SET NOT NULL",
  ]);
  assert.deepEqual(findUnmarkedDestructive('ALTER TABLE "users" ALTER COLUMN "a" SET DATA TYPE bigint;'), [
    "ALTER COLUMN TYPE",
  ]);
  assert.deepEqual(findUnmarkedDestructive('DROP TABLE "old";'), ["DROP TABLE"]);
});

test("đã đánh dấu contract thì cho qua", () => {
  const sql = `-- contract: v1.4.0 đã ngừng đọc cột phone\nALTER TABLE "users" DROP COLUMN "phone";`;
  assert.deepEqual(findUnmarkedDestructive(sql), []);
});

test("chữ trong chú thích hoặc dữ liệu không bị bắt nhầm", () => {
  const sql = `-- sau này sẽ DROP COLUMN phone\nINSERT INTO notes VALUES ('drop table users');`;
  assert.deepEqual(findUnmarkedDestructive(sql), []);
});
