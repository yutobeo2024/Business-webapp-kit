// Dựng lại DB CỤC BỘ từ đầu (xóa, tạo lại, chạy migration; DB dev thì seed thêm --demo).
//   pnpm db:reset-local          -> app_test (DB của test tích hợp)
//   pnpm db:reset-local dev      -> app_dev  (mất dữ liệu dev)
// Dùng khi migration CHƯA commit đã áp vào DB cục bộ rồi phải xóa/sinh lại (skill /db-migration), hoặc DB test bị bẩn.
// Chỉ chạy trên Postgres của `pnpm dev:services` (docker compose infra/compose.dev.yml), không bao giờ đụng máy chủ.
// Cần build trước (`pnpm build`): chạy migrate/seed từ dist.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] ?? "test";
const DBS = { test: "app_test", dev: "app_dev" };
const db = DBS[target];
if (!db) {
  console.error("Dùng: pnpm db:reset-local [test|dev]");
  process.exit(1);
}
if (process.env.NODE_ENV === "production") {
  console.error("DỪNG: NODE_ENV=production. Lệnh này chỉ cho DB cục bộ.");
  process.exit(1);
}
for (const f of ["packages/db/dist/migrate.js", "apps/api/dist/cli/seed.js"]) {
  if (!existsSync(join(root, f))) {
    console.error(`Chưa build (${f}). Chạy: pnpm build`);
    process.exit(1);
  }
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run("docker", [
  "compose",
  "-f",
  "infra/compose.dev.yml",
  "exec",
  "-T",
  "postgres",
  "psql",
  "-U",
  "app",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
  "-c",
  `drop database if exists ${db} with (force)`,
  "-c",
  `create database ${db}`,
]);
// Biến đặt sẵn thắng .env (--env-file-if-exists không ghi đè): luôn trỏ đúng DB vừa tạo.
const env = { ...process.env, DATABASE_URL: `postgresql://app:app@localhost:5432/${db}` };
run(process.execPath, ["--env-file-if-exists=../../.env", "dist/migrate.js"], {
  cwd: join(root, "packages/db"),
  env,
});
if (target === "dev") {
  run(process.execPath, ["--env-file-if-exists=../../.env", "dist/cli/seed.js", "--demo"], {
    cwd: join(root, "apps/api"),
    env,
  });
}
console.log(`Đã dựng lại ${db}.`);
