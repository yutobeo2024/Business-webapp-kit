// Chạy: node --test scripts/kit-sync.test.mjs
// Dựng repo kit giả (template/ ở 2 tag kit-v1.0.0, kit-v1.1.0) và dự án giả cài từ 1.0.0, rồi kiểm từng nhóm tệp.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { syncProject } from "./kit-sync.mjs";

const git = (cwd, ...args) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...args], {
    cwd,
    encoding: "utf8",
  });
function put(root, files) {
  for (const [p, c] of Object.entries(files)) {
    const f = join(root, p);
    if (c === null) {
      rmSync(f, { force: true });
      continue;
    }
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, c);
  }
}

const V1 = {
  "template/core.ts": "a\nb\nc\n",
  "template/shared.ts": "line1\nline2\nline3\nline4\nline5\n",
  "template/old.ts": "cu\n",
  "template/project-edited-old.ts": "x\n",
  "template/conflict.ts": "giá trị = 1\n",
  "template/.env.example": "A=1\n",
  "template/pnpm-lock.yaml": "lock: 1\n",
  "template/packages/db/migrations/0000_init.sql": "CREATE TABLE a (id int);\n",
  "template/infra/deploy.sh": "echo 1\n",
  "template/apps/api/src/modules/purchase-requests/pr.ts": "mau\n",
  "template/registry.ts": "export const R = [\n  'core',\n];\n",
  "template/apps/web/brand.json": '{ "primary": "#111111" }\n',
  "CHANGELOG.md": "# Nhật ký\n\n## 1.0.0\n\nĐầu tiên.\n",
};
const V2 = {
  "template/core.ts": "a\nb\nc\nd\n", // kit đổi, dự án giữ
  "template/shared.ts": "line1 kit\nline2\nline3\nline4\nline5\n", // cả hai đổi, khác chỗ
  "template/old.ts": null, // kit xóa, dự án giữ
  "template/project-edited-old.ts": null, // kit xóa, dự án đã sửa
  "template/conflict.ts": "giá trị = 2\n", // cả hai đổi cùng dòng
  "template/new.ts": "moi\n", // kit thêm
  "template/apps/web/brand.json": '{ "primary": "#222222" }\n', // kit đổi mặc định, dự án đã đặt màu của khách
  "template/same-idea.ts": "kit làm\n", // dự án đã tự có tệp cùng tên
  "template/pnpm-lock.yaml": "lock: 2\n",
  "template/.env.example":
    "A=1\nDATABASE_URL=postgresql://app:app@localhost:5432/app_dev\nTEST_DATABASE_URL=postgresql://app:app@localhost:5432/app_test\nNEW_KEY=gia-tri\n",
  "template/packages/db/migrations/0001_add.sql":
    "CREATE TABLE b (id int);\n--> statement-breakpoint\nINSERT INTO b SELECT id FROM a;\n",
  "template/infra/deploy.sh": "echo 2\n",
  "template/apps/api/src/modules/purchase-requests/pr.ts": "mau 2\n",
  "template/apps/api/src/modules/purchase-requests/pr-new.ts": "mau moi\n",
  "template/registry.ts": "export const R = [\n  'core',\n  'core2',\n  // sample:begin\n  'pr',\n  // sample:end\n];\n",
  "template/scripts/sample-manifest.json": JSON.stringify({
    delete: ["apps/api/src/modules/purchase-requests"],
    scan: [],
    residue: [],
  }),
  "CHANGELOG.md":
    "# Nhật ký\n\n## 1.1.0\n\nNâng cấp dự án tạo từ 1.0.x\n\n- Thêm `B=1` vào `.env`.\n\n## 1.0.0\n\nĐầu tiên.\n",
};

function makeKit() {
  const kit = mkdtempSync(join(tmpdir(), "kit-"));
  git(kit, "init", "-q", "-b", "master");
  put(kit, V1);
  git(kit, "add", "-A");
  git(kit, "commit", "-qm", "1.0.0");
  git(kit, "tag", "-a", "kit-v1.0.0", "-m", "1.0.0");
  put(kit, V2);
  git(kit, "add", "-A");
  git(kit, "commit", "-qm", "1.1.0");
  git(kit, "tag", "-a", "kit-v1.1.0", "-m", "1.1.0");
  return kit;
}

function makeProject(kit, { removeSample = false } = {}) {
  const proj = mkdtempSync(join(tmpdir(), "proj-"));
  execFileSync("git", ["-C", kit, "archive", "kit-v1.0.0", "template"]).length; // kiểm ref tồn tại
  const files = Object.fromEntries(
    Object.entries(V1)
      .filter(([p]) => p.startsWith("template/"))
      .map(([p, c]) => [p.slice("template/".length), c]),
  );
  put(proj, files);
  put(proj, { ".env": "A=khac\nSECRET=x\nDATABASE_URL=postgresql://app:app@localhost:5432/kho_dev\n" });
  git(proj, "init", "-q", "-b", "main");
  writeFileSync(join(proj, ".gitignore"), ".env\n");
  git(proj, "add", "-A");
  git(proj, "commit", "-qm", "chore: khởi tạo từ business-webapp-kit 1.0.0");
  // Dự án tự sửa
  put(proj, {
    "shared.ts": "line1\nline2\nline3\nline4\nline5 du an\n",
    "conflict.ts": "giá trị = 99\n",
    "project-edited-old.ts": "x da sua\n",
    "same-idea.ts": "du an tu lam\n",
    "packages/db/migrations/0001_du_an.sql": "CREATE TABLE c (id int);\n",
    "module.ts": "nghiep vu\n",
    "apps/web/brand.json": '{ "primary": "#0b5fff" }\n',
  });
  if (removeSample) {
    rmSync(join(proj, "apps/api/src/modules/purchase-requests"), { recursive: true, force: true });
  }
  git(proj, "add", "-A");
  git(proj, "commit", "-qm", "feat: module");
  return proj;
}

const read = (proj, p) => readFileSync(join(proj, p), "utf8");

test("phân loại và áp dụng: kit đổi, thêm, xóa, trộn, xung đột, bỏ qua lockfile/migration/.env", () => {
  const kit = makeKit();
  const proj = makeProject(kit);
  const r = syncProject({ kitDir: kit, projectDir: proj, to: "1.1.0" });
  assert.equal(r.from, "1.0.0"); // đọc từ commit đầu
  assert.equal(r.to, "1.1.0");
  assert.equal(git(proj, "branch", "--show-current").trim(), "kit-sync/1.0.0-1.1.0");

  assert.equal(read(proj, "core.ts"), "a\nb\nc\nd\n");
  assert.equal(read(proj, "new.ts"), "moi\n");
  assert.equal(existsSync(join(proj, "old.ts")), false);
  assert.equal(read(proj, "project-edited-old.ts"), "x da sua\n"); // không đụng, chỉ báo
  assert.equal(read(proj, "shared.ts"), "line1 kit\nline2\nline3\nline4\nline5 du an\n"); // trộn sạch
  assert.match(read(proj, "conflict.ts"), /<<<<<<< du-an[\s\S]*giá trị = 99[\s\S]*>>>>>>> kit-1\.1\.0/);
  assert.match(read(proj, "same-idea.ts"), /<<<<<<</);
  assert.equal(read(proj, "module.ts"), "nghiep vu\n");
  assert.equal(read(proj, "apps/web/brand.json"), '{ "primary": "#0b5fff" }\n'); // thương hiệu là của dự án
  assert.equal(read(proj, "pnpm-lock.yaml"), "lock: 1\n");
  assert.equal(existsSync(join(proj, "packages/db/migrations/0001_add.sql")), false);
  // .env: chỉ thêm khóa thiếu (DB test suy từ DB dev của dự án), không sửa khóa đã có
  const env = read(proj, ".env");
  assert.match(env, /^A=khac\nSECRET=x\n/);
  assert.match(env, /TEST_DATABASE_URL=postgresql:\/\/app:app@localhost:5432\/kho_test\n/);
  assert.match(env, /NEW_KEY=gia-tri\n/);
  assert.equal((env.match(/^DATABASE_URL=/gm) || []).length, 1);
  assert.match(read(proj, "docs/kit-sync/1.0.0-1.1.0.md"), /NEW_KEY=gia-tri/);
  assert.equal(read(proj, "infra/deploy.sh"), "echo 2\n"); // tệp bảo vệ, dự án không đổi: lấy bản kit

  assert.deepEqual(r.groups.updated.sort(), [".env.example", "apps/api/src/modules/purchase-requests/pr.ts", "core.ts", "infra/deploy.sh", "registry.ts"]);
  assert.deepEqual(r.groups.added.sort(), ["apps/api/src/modules/purchase-requests/pr-new.ts", "new.ts", "scripts/sample-manifest.json"]);
  assert.deepEqual(r.groups.deleted, ["old.ts"]);
  assert.deepEqual(r.groups.merged, ["shared.ts"]);
  assert.deepEqual(r.groups.conflicts.sort(), ["conflict.ts", "same-idea.ts"]);
  assert.deepEqual(r.groups.reportOnly.map((x) => x.path), ["project-edited-old.ts"]);

  // Báo cáo: migration cần port (có SQL dữ liệu), ghi chú nâng cấp từ CHANGELOG, .kit.json mới
  const report = read(proj, "docs/kit-sync/1.0.0-1.1.0.md");
  assert.match(report, /0001_add\.sql/);
  assert.match(report, /INSERT INTO b SELECT id FROM a/);
  assert.match(report, /Thêm `B=1` vào `\.env`/);
  assert.doesNotMatch(report, /Đầu tiên/); // bản cũ không lặp lại
  assert.equal(JSON.parse(read(proj, ".kit.json")).version, "1.1.0");
});

test("dự án đã gỡ mẫu: không đưa tệp mẫu trở lại, cắt khối sample trước khi trộn", () => {
  const kit = makeKit();
  const proj = makeProject(kit, { removeSample: true });
  const r = syncProject({ kitDir: kit, projectDir: proj, to: "1.1.0" });
  assert.equal(r.sampleRemoved, true);
  assert.equal(existsSync(join(proj, "apps/api/src/modules/purchase-requests")), false);
  assert.equal(read(proj, "registry.ts"), "export const R = [\n  'core',\n  'core2',\n];\n");
  assert.ok(!r.groups.added.some((p) => p.includes("purchase-requests")));
});

test("dry-run không sửa gì; cây bẩn bị từ chối; .kit.json được ưu tiên hơn commit đầu", () => {
  const kit = makeKit();
  const proj = makeProject(kit);
  const r = syncProject({ kitDir: kit, projectDir: proj, to: "1.1.0", dryRun: true });
  assert.equal(r.groups.updated.length, 5);
  assert.equal(read(proj, "core.ts"), "a\nb\nc\n");
  assert.equal(git(proj, "branch", "--show-current").trim(), "main");

  writeFileSync(join(proj, "core.ts"), "ban\n");
  assert.throws(() => syncProject({ kitDir: kit, projectDir: proj, to: "1.1.0" }), /chưa commit/);
  git(proj, "checkout", "--", "core.ts");

  writeFileSync(join(proj, ".kit.json"), JSON.stringify({ version: "1.1.0" }));
  git(proj, "add", "-A");
  git(proj, "commit", "-qm", "kit 1.1.0");
  assert.throws(() => syncProject({ kitDir: kit, projectDir: proj, to: "1.1.0" }), /đã ở bản 1\.1\.0/);
});
