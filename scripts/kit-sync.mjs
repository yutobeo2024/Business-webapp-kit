// Nâng cấp một dự án đã tạo từ kit lên bản kit mới hơn (phần cơ học, không dùng AI).
//   node scripts/kit-sync.mjs <thư-mục-dự-án> [--to 1.4.1] [--from 1.3.0] [--dry-run]
// So 3 phía cho từng tệp trong template: kit lúc cài (base), kit mới (target), dự án hiện tại. Tệp chỉ kit đổi thì ghi
// bản mới; cả hai cùng đổi thì trộn ba chiều (`git merge-file`), xung đột để lại dấu <<<<<<< cho người hoặc skill
// /kit-upgrade của dự án giải. Không chép migration (sinh lại từ schema trong dự án), không đụng .env, lockfile.
// Làm trên nhánh mới `kit-sync/<from>-<to>`, không commit; ghi báo cáo docs/kit-sync/<from>-<to>.md và .kit.json.
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseEnv } from "node:util";

const KIT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Cắt khối `sample` đúng như lệnh `pnpm sample:remove` của kit.
const { stripSample: STRIP_SAMPLE } = await import(
  pathToFileURL(join(KIT_DIR, "template", "scripts", "remove-sample.mjs")).href
);
const SKIP = (p) =>
  p === ".env" || p === ".kit.json" || p === "pnpm-lock.yaml" || p.startsWith("packages/db/migrations/");
// Hook của dự án chặn agent sửa các tệp này: công cụ phải giải xong, xung đột thì báo người.
const PROTECTED = (p) =>
  /^\.claude\/(hooks\/|settings(\.local)?\.json$)/.test(p) || /^(infra|\.github\/workflows)\//.test(p);
const CODE_EXT = /\.(ts|tsx|mts|mjs|js|cjs)$/;

function git(cwd, args, { buffer = false, allowFail = false } = {}) {
  const r = spawnSync("git", args, { cwd, encoding: buffer ? "buffer" : "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0 && !allowFail) {
    throw new Error(`git ${args.join(" ")}: ${(r.stderr || "").toString().trim()}`);
  }
  return r;
}

const ref = (v) => `refs/tags/kit-v${v}`;
const cmpVer = (a, b) => {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

/** Tệp trong template ở một phiên bản: path -> { sha, mode }. */
function listTemplate(kitDir, v) {
  const out = git(kitDir, ["ls-tree", "-r", "-z", `${ref(v)}:template`]).stdout;
  const map = new Map();
  for (const e of out.split("\0").filter(Boolean)) {
    const [meta, path] = e.split("\t");
    const [mode, type, sha] = meta.split(" ");
    if (type === "blob") map.set(path, { sha, mode });
  }
  return map;
}
const blob = (kitDir, sha) => git(kitDir, ["cat-file", "blob", sha], { buffer: true }).stdout;
const isBinary = (buf) => buf.includes(0);

function detectFrom(projectDir) {
  const kj = join(projectDir, ".kit.json");
  if (existsSync(kj)) return JSON.parse(readFileSync(kj, "utf8")).version;
  const first = git(projectDir, ["log", "--reverse", "--format=%s"]).stdout.split("\n")[0] ?? "";
  return /business-webapp-kit (\d+\.\d+\.\d+)/.exec(first)?.[1];
}

/** Các mục `## <ver>` của CHANGELOG có from < ver <= to (ghi chú nâng cấp, biến .env mới...). */
function changelogBetween(kitDir, to, from) {
  const text = git(kitDir, ["show", `${ref(to)}:CHANGELOG.md`], { allowFail: true }).stdout || "";
  const parts = text.split(/^(?=## \d+\.\d+\.\d+)/m).slice(1);
  return parts.filter((p) => {
    const v = /^## (\d+\.\d+\.\d+)/.exec(p)[1];
    return cmpVer(v, from) > 0 && cmpVer(v, to) <= 0;
  });
}

/** Trộn ba chiều bằng git merge-file. Trả { text, conflicts }. */
function merge3(project, base, target, from, to) {
  const dir = mkdtempSync(join(tmpdir(), "kit-sync-"));
  try {
    const [a, b, c] = ["du-an", "base", "kit"].map((n) => join(dir, n));
    writeFileSync(a, project);
    writeFileSync(b, base);
    writeFileSync(c, target);
    const r = spawnSync(
      "git",
      ["merge-file", "-p", "-L", "du-an", "-L", `kit-${from}`, "-L", `kit-${to}`, a, b, c],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (r.status < 0 || r.status === null) throw new Error(`git merge-file lỗi: ${r.stderr}`);
    return { text: r.stdout, conflicts: r.status };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function syncProject({ kitDir = KIT_DIR, projectDir, from, to, dryRun = false }) {
  projectDir = resolve(projectDir);
  if (git(projectDir, ["rev-parse", "--is-inside-work-tree"], { allowFail: true }).status !== 0) {
    throw new Error(`${projectDir} không phải repo git.`);
  }
  const tags = git(kitDir, ["tag", "--list", "kit-v*"])
    .stdout.split("\n")
    .filter(Boolean)
    .map((t) => t.slice("kit-v".length))
    .sort(cmpVer);
  to ??= tags.at(-1);
  from ??= detectFrom(projectDir);
  if (!from) throw new Error("Không biết dự án tạo từ bản kit nào: thêm --from <phiên bản>.");
  for (const v of [from, to]) if (!tags.includes(v)) throw new Error(`Repo kit không có tag kit-v${v}.`);
  if (cmpVer(from, to) >= 0) throw new Error(`Dự án đã ở bản ${from}, không có gì để nâng lên ${to}.`);
  if (!dryRun && git(projectDir, ["status", "--porcelain"]).stdout.trim()) {
    throw new Error("Dự án còn thay đổi chưa commit: commit hoặc cất đi trước khi đồng bộ.");
  }

  const base = listTemplate(kitDir, from);
  const target = listTemplate(kitDir, to);

  // Dự án đã gỡ module mẫu: không đưa tệp mẫu trở lại, cắt khối `sample` khỏi nội dung kit trước khi trộn.
  let sampleDeletes = [];
  const manifestEntry = target.get("scripts/sample-manifest.json");
  if (manifestEntry) {
    sampleDeletes = JSON.parse(blob(kitDir, manifestEntry.sha).toString("utf8")).delete ?? [];
  }
  const sampleRemoved =
    sampleDeletes.length > 0 && !existsSync(join(projectDir, "apps/api/src/modules/purchase-requests"));
  const isSample = (p) => sampleRemoved && sampleDeletes.some((d) => p === d || p.startsWith(`${d}/`));

  const groups = { updated: [], added: [], deleted: [], merged: [], conflicts: [], protectedConflicts: [], reportOnly: [] };
  const writes = [];
  const deletes = [];
  const executables = [];

  return run();

  function run() {
    // stripSample của kit (nạp sẵn lúc import module, cuối tệp): cắt khối sample như `pnpm sample:remove`.
    const stripSample = sampleRemoved ? STRIP_SAMPLE : null;
    const stripFailed = new Set();
    const text = (buf, path) => {
      const s = buf.toString("utf8");
      // scripts/ chứa chính công cụ gỡ mẫu (nhắc tới dấu đánh dấu trong chú thích): không cắt, như sample:remove.
      if (!stripSample || !/sample/.test(s) || path.startsWith("scripts/")) return s;
      const kind = path.endsWith(".md") ? "md" : CODE_EXT.test(path) ? "code" : null;
      if (!kind) return s;
      try {
        return stripSample(s, kind);
      } catch (e) {
        stripFailed.add(`${path}: ${e.message}`);
        return s;
      }
    };

    for (const path of [...new Set([...base.keys(), ...target.keys()])].sort()) {
      if (SKIP(path) || isSample(path)) continue;
      const B = base.get(path);
      const N = target.get(path);
      const projPath = join(projectDir, path);
      const P = existsSync(projPath) ? readFileSync(projPath) : null;
      if (B && N && B.sha === N.sha) continue; // kit không đổi tệp này
      const Bbuf = B ? blob(kitDir, B.sha) : null;
      const Nbuf = N ? blob(kitDir, N.sha) : null;
      const binary = [Bbuf, Nbuf, P].some((b) => b && isBinary(b));
      const Btxt = Bbuf && !binary ? text(Bbuf, path) : null;
      const Ntxt = Nbuf && !binary ? text(Nbuf, path) : null;
      const projSameAsBase = P && Bbuf && (binary ? P.equals(Bbuf) : P.toString("utf8") === Btxt || P.equals(Bbuf));

      if (!N) {
        // kit xóa
        if (!P) continue;
        if (projSameAsBase) {
          deletes.push(path);
          groups.deleted.push(path);
        } else groups.reportOnly.push({ path, reason: "kit đã xóa tệp này, dự án đã sửa: tự quyết giữ hay bỏ" });
        continue;
      }
      if (N.mode === "100755") executables.push(path);
      const newContent = binary ? Nbuf : Ntxt;
      if (!P) {
        if (B) {
          groups.reportOnly.push({ path, reason: "dự án đã xóa tệp này, kit có thay đổi: xem lại có cần không" });
        } else {
          writes.push([path, newContent]);
          groups.added.push(path);
        }
        continue;
      }
      const Ptxt = binary ? null : P.toString("utf8");
      if (binary ? P.equals(Nbuf) : Ptxt === Ntxt) continue; // dự án đã giống bản mới
      if (projSameAsBase) {
        writes.push([path, newContent]);
        groups.updated.push(path);
        continue;
      }
      if (binary) {
        groups.reportOnly.push({ path, reason: "tệp nhị phân, cả hai cùng đổi: chọn tay" });
        continue;
      }
      const m = merge3(Ptxt, Btxt ?? "", Ntxt, from, to);
      if (m.conflicts === 0) {
        writes.push([path, m.text]);
        groups.merged.push(path);
      } else if (PROTECTED(path)) {
        // Agent không sửa được tệp bảo vệ: giữ bản dự án, để bản kit cạnh bên cho người trộn.
        writes.push([`${path}.kit-${to}`, Ntxt]);
        groups.protectedConflicts.push(path);
      } else {
        writes.push([path, m.text]);
        groups.conflicts.push(path);
      }
    }

    for (const f of stripFailed) {
      groups.reportOnly.push({ path: f.split(":")[0], reason: `không cắt được khối sample (${f.slice(f.indexOf(":") + 2)}), đã trộn nguyên bản` });
    }

    // Migration của kit trong khoảng from..to: không chép, báo để sinh lại từ schema và port SQL dữ liệu.
    const migrations = [...target.keys()]
      .filter((p) => /^packages\/db\/migrations\/[^/]+\.sql$/.test(p) && !base.has(p))
      .sort()
      .map((p) => {
        const sql = blob(kitDir, target.get(p).sha).toString("utf8");
        const data = sql
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter((s) => /^(--[^\n]*\n)*\s*(INSERT|UPDATE|DELETE|DO\s|WITH\s)/i.test(s) || /\bDO \$\$/.test(s));
        return { path: p, sql, data };
      });

    const envAdds = missingEnv(projectDir, target.get(".env.example") && blob(kitDir, target.get(".env.example").sha));
    const sha = git(kitDir, ["rev-list", "-n", "1", ref(to)]).stdout.trim();
    const report = renderReport({
      from,
      to,
      groups,
      migrations,
      envAdds,
      notes: changelogBetween(kitDir, to, from),
      sampleRemoved,
    });

    if (!dryRun) {
      git(projectDir, ["checkout", "-q", "-b", `kit-sync/${from}-${to}`]);
      for (const [p, c] of writes) {
        const f = join(projectDir, p);
        mkdirSync(dirname(f), { recursive: true });
        writeFileSync(f, c);
        if (executables.includes(p)) chmodSync(f, 0o755);
      }
      for (const p of deletes) rmSync(join(projectDir, p), { force: true });
      if (envAdds.length) {
        // .env không nằm trong git: chỉ THÊM khóa còn thiếu, không bao giờ sửa giá trị đã có.
        const f = join(projectDir, ".env");
        const cur = readFileSync(f, "utf8");
        const add = envAdds.map(([k, v]) => `${k}=${v}`).join("\n");
        writeFileSync(f, `${cur.replace(/\n*$/, "\n")}\n# Thêm bởi kit-sync ${to} (xem .env.example)\n${add}\n`);
      }
      writeFileSync(join(projectDir, ".kit.json"), `${JSON.stringify({ version: to, commit: sha }, null, 2)}\n`);
      const rp = join(projectDir, "docs", "kit-sync", `${from}-${to}.md`);
      mkdirSync(dirname(rp), { recursive: true });
      writeFileSync(rp, report);
      // Đưa vào staging (chưa commit) để `git diff --cached` thấy rõ; giữ bit +x cho script (Windows bỏ bit này).
      git(projectDir, ["add", "-A"]);
      const exe = executables.filter((p) => writes.some(([w]) => w === p) && existsSync(join(projectDir, p)));
      if (exe.length) git(projectDir, ["update-index", "--chmod=+x", "--", ...exe]);
    }
    return { from, to, sampleRemoved, groups, migrations, report };
  }
}

/**
 * Khóa có trong .env.example của kit mới mà .env của dự án chưa có: [khóa, giá trị]. DB/Redis test suy từ cấu hình dev
 * của dự án (DB riêng mỗi dự án, kit 1.4.1), còn lại lấy giá trị mẫu. Không có .env (CI) thì không làm gì.
 */
function missingEnv(projectDir, exampleBuf) {
  const f = join(projectDir, ".env");
  if (!exampleBuf || !existsSync(f)) return [];
  const cur = parseEnv(readFileSync(f, "utf8"));
  const example = parseEnv(exampleBuf.toString("utf8"));
  const out = [];
  for (const [k, v] of Object.entries(example)) {
    if (k in cur) continue;
    let value = v;
    if (k === "TEST_DATABASE_URL" && cur.DATABASE_URL) {
      const u = new URL(cur.DATABASE_URL);
      const db = u.pathname.slice(1);
      u.pathname = `/${db.endsWith("_dev") ? db.slice(0, -4) : db}_test`;
      value = u.toString();
    } else if (k === "TEST_REDIS_URL" && cur.REDIS_URL) {
      const u = new URL(cur.REDIS_URL);
      const n = Number(u.pathname.slice(1) || "0");
      u.pathname = `/${n >= 1 && n <= 7 ? n + 8 : 15}`;
      value = u.toString();
    }
    out.push([k, value]);
  }
  return out;
}

function renderReport({ from, to, groups, migrations, envAdds, notes, sampleRemoved }) {
  const list = (a) => (a.length ? a.map((p) => `- \`${p}\``).join("\n") : "- (không có)");
  const lines = [
    `# Nâng kit ${from} lên ${to}`,
    "",
    "Sinh bởi `kit-sync` (phần cơ học). Việc còn lại theo skill `/kit-upgrade`: giải xung đột, sinh migration, kiểm tra.",
    sampleRemoved ? "\nDự án đã gỡ module mẫu: tệp mẫu của kit được bỏ qua, khối `sample` đã cắt trước khi trộn." : "",
    "",
    `## Còn xung đột (${groups.conflicts.length}): giải dấu <<<<<<< / >>>>>>>`,
    "",
    "Phía `du-an` là bản dự án, phía `kit-" + to + "` là bản kit mới. Lõi theo kit, nghiệp vụ của dự án giữ.",
    "",
    list(groups.conflicts),
    "",
    `## Tệp bảo vệ xung đột (${groups.protectedConflicts.length}): NGƯỜI trộn tay`,
    "",
    "Hook chặn agent sửa các tệp này. Bản kit mới nằm cạnh bên với đuôi `.kit-" + to + "`; trộn xong thì xóa tệp đó.",
    "",
    list(groups.protectedConflicts),
    "",
    `## Biến .env đã thêm (${envAdds.length})`,
    "",
    "Khóa mới trong `.env.example` của kit mà `.env` chưa có, đã thêm vào cuối `.env` (không sửa khóa cũ). Kiểm lại giá",
    "trị, nhất là trên máy chủ (`infra/.env` do người vận hành giữ, công cụ không đụng).",
    "",
    envAdds.length ? envAdds.map(([k, v]) => `- \`${k}=${v}\``).join("\n") : "- (không có)",
    "",
    "## Cần xem lại",
    "",
    groups.reportOnly.length ? groups.reportOnly.map((x) => `- \`${x.path}\`: ${x.reason}`).join("\n") : "- (không có)",
    "",
    `## Migration của kit (${migrations.length}): không chép, sinh lại`,
    "",
    "Schema đã trộn: chạy `pnpm db:generate --name kit_" + to.replaceAll(".", "_") + "` rồi đọc SQL sinh ra.",
    "Phần SQL dữ liệu dưới đây phải chép tay vào migration mới (nếu còn áp dụng cho dự án).",
    "",
    ...migrations.flatMap((m) => [
      `### \`${m.path}\``,
      "",
      m.data.length ? "SQL dữ liệu cần port:" : "Chỉ DDL (tự có khi db:generate).",
      "",
      "```sql",
      m.sql.trim(),
      "```",
      "",
    ]),
    `## Đã tự áp dụng`,
    "",
    `Trộn sạch (${groups.merged.length}):`,
    "",
    list(groups.merged),
    "",
    `Lấy bản kit (dự án chưa sửa) (${groups.updated.length}):`,
    "",
    list(groups.updated),
    "",
    `Thêm mới (${groups.added.length}):`,
    "",
    list(groups.added),
    "",
    `Xóa (kit đã bỏ, dự án chưa sửa) (${groups.deleted.length}):`,
    "",
    list(groups.deleted),
    "",
    "## Ghi chú các bản kit ở giữa (CHANGELOG)",
    "",
    "Làm theo mục \"Nâng cấp\" của từng bản (biến `.env` mới, bước tay...).",
    "",
    ...notes.map((n) => n.trim().replace(/^## /, "### ") + "\n"),
  ];
  return lines.join("\n");
}


if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => {
    const i = args.indexOf(n);
    return i >= 0 ? args.splice(i, 2)[1] : undefined;
  };
  const from = opt("--from");
  const to = opt("--to");
  const dryRun = args.includes("--dry-run");
  const projectDir = args.find((a) => !a.startsWith("--"));
  if (!projectDir) {
    console.error("Dùng: node scripts/kit-sync.mjs <thư-mục-dự-án> [--to X.Y.Z] [--from X.Y.Z] [--dry-run]");
    process.exit(1);
  }
  try {
    const r = syncProject({ projectDir, from, to, dryRun });
    const g = r.groups;
    console.log(
      `Kit ${r.from} -> ${r.to}${dryRun ? " (dry-run, chưa sửa gì)" : ""}: cập nhật ${g.updated.length}, thêm ${g.added.length}, ` +
        `xóa ${g.deleted.length}, trộn sạch ${g.merged.length}, XUNG ĐỘT ${g.conflicts.length}, tệp bảo vệ xung đột ` +
        `${g.protectedConflicts.length}, cần xem ${g.reportOnly.length}, migration của kit ${r.migrations.length}.`,
    );
    if (!dryRun) {
      console.log(`Báo cáo: docs/kit-sync/${r.from}-${r.to}.md. Mở Claude Code trong dự án và chạy /kit-upgrade.`);
    }
  } catch (e) {
    console.error(`DỪNG: ${e.message}`);
    process.exit(1);
  }
}
