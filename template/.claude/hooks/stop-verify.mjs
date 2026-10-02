// Stop: trước khi Claude báo "xong", chạy pnpm verify:quick (lint + typecheck + unit test).
// Đỏ thì buộc Claude sửa tiếp, tối đa 3 lần mỗi phiên để không lặp vô hạn.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pass, projectDir, readInput, tail } from "./_lib.mjs";

const MAX_RETRY = 3;
const input = readInput();
const root = projectDir(input);
const shell = process.platform === "win32";

// Chỉ kiểm khi có thay đổi mã nguồn (đổi tài liệu thì không cần chạy test).
const st = spawnSync("git", ["status", "--porcelain", "--", "apps", "packages", "e2e"], {
  cwd: root,
  encoding: "utf8",
});
if (st.status !== 0 || !st.stdout.trim()) pass();
if (!existsSync(join(root, "node_modules"))) pass();

const counterFile = join(
  tmpdir(),
  `claude-verify-${String(input.session_id || "default").replace(/\W/g, "")}.txt`,
);
const count = existsSync(counterFile) ? Number(readFileSync(counterFile, "utf8")) || 0 : 0;
const save = (n) => {
  try {
    writeFileSync(counterFile, String(n));
  } catch {
    /* bỏ qua: không ghi được bộ đếm thì vẫn kiểm bình thường */
  }
};

const r = spawnSync("pnpm", ["run", "verify:quick"], {
  cwd: root,
  encoding: "utf8",
  shell,
  timeout: 540_000,
});
if (r.status === 0) {
  save(0);
  pass();
}
if (count >= MAX_RETRY) {
  save(0);
  process.stderr.write("verify:quick vẫn đỏ sau 3 lần sửa. Dừng lại và báo rõ cho người dùng lỗi còn lại.\n");
  pass();
}
save(count + 1);
process.stderr.write(
  `pnpm verify:quick đang ĐỎ (lần ${count + 1}/${MAX_RETRY}). Chưa được báo hoàn thành.\n` +
    "Sửa nguyên nhân gốc. Không xóa/skip test, không thêm eslint-disable hay @ts-ignore để lách.\n" +
    "Nếu lỗi nằm ngoài phạm vi task, dừng lại và báo người dùng.\n\n" +
    tail(r.stdout + r.stderr, 80) +
    "\n",
);
process.exit(2);
