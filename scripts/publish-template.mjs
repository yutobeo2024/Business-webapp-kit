// Phát hành một bản kit sang repo template (GitHub "Use this template"): gốc repo template = nội dung `template/` của
// tag kit-v<phiên bản>, thêm `.kit.json`. Mỗi bản phát hành là MỘT commit trên `main` của repo template, gắn cùng tag.
//   node scripts/publish-template.mjs <phiên bản> [--repo owner/name] [--push]
// Không có --push: dựng commit + tag trong bản clone tạm và in lệnh đẩy (người phát hành tự chạy).
// Dùng thẳng cây git của tag (không giải nén) nên giữ đúng bit +x của infra/*.sh và không lẫn tệp ngoài git.
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const KIT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function git(cwd, args, input) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", input, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${(r.stderr || "").trim()}`);
  return r.stdout.trim();
}

export function publishTemplate({ version, repo = "yutobeo2024/Business-webapp-template", push = false, kitDir = KIT_DIR, remoteUrl }) {
  if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) throw new Error("Phiên bản dạng X.Y.Z, ví dụ 1.5.0.");
  const tag = `kit-v${version}`;
  const kitCommit = git(kitDir, ["rev-list", "-n", "1", `refs/tags/${tag}`]);
  const url = remoteUrl ?? `https://github.com/${repo}.git`;

  const dir = mkdtempSync(join(tmpdir(), "kit-template-"));
  git(dir, ["init", "-q", "-b", "main"]);
  git(dir, ["remote", "add", "origin", url]);
  // Repo template mới tạo có thể chưa có commit nào: fetch lỗi vì chưa có main thì coi như bản phát hành đầu.
  const fetched = spawnSync("git", ["fetch", "-q", "--tags", "origin", "main"], { cwd: dir, encoding: "utf8" });
  const parent = fetched.status === 0 ? git(dir, ["rev-parse", "FETCH_HEAD"]) : null;
  const tags = spawnSync("git", ["tag", "--list", tag], { cwd: dir, encoding: "utf8" }).stdout.trim();
  if (tags) throw new Error(`Repo template đã có tag ${tag}: mỗi bản chỉ phát hành một lần.`);

  // Lấy cây template/ của tag kit (kèm object) vào clone tạm, thêm .kit.json, dựng commit.
  git(dir, ["fetch", "-q", kitDir, `refs/tags/${tag}`]);
  const tree = git(dir, ["rev-parse", "FETCH_HEAD^{commit}:template"]);
  const kitJson = `${JSON.stringify({ version, commit: kitCommit }, null, 2)}\n`;
  const blob = git(dir, ["hash-object", "-w", "--stdin"], kitJson);
  const entries = git(dir, ["ls-tree", tree])
    .split("\n")
    .filter((l) => l && !l.endsWith("\t.kit.json"));
  entries.push(`100644 blob ${blob}\t.kit.json`);
  const newTree = git(dir, ["mktree"], `${entries.join("\n")}\n`);
  const msg = `business-webapp-kit ${version}\n\nNội dung template/ của kit tại ${tag} (${kitCommit.slice(0, 7)}).`;
  const commit = git(
    dir,
    ["-c", "user.name=business-webapp-kit", "-c", "user.email=kit@localhost", "commit-tree", newTree, ...(parent ? ["-p", parent] : []), "-m", msg],
  );
  git(dir, ["update-ref", "refs/heads/main", commit]);
  git(dir, ["-c", "user.name=business-webapp-kit", "-c", "user.email=kit@localhost", "tag", "-a", tag, commit, "-m", `business-webapp-kit ${version}`]);
  git(dir, ["checkout", "-q", "main"]);

  const pushCmd = `git -C "${dir}" push origin main refs/tags/${tag}`;
  if (push) git(dir, ["push", "-q", "origin", "main", `refs/tags/${tag}`]);
  return { dir, commit, parent, pushCmd, pushed: push };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--repo");
  const repo = i >= 0 ? args.splice(i, 2)[1] : undefined;
  const push = args.includes("--push");
  const version = args.find((a) => !a.startsWith("--"));
  try {
    const r = publishTemplate({ version, repo, push });
    console.log(`Đã dựng commit ${r.commit.slice(0, 7)} (${r.parent ? "nối tiếp bản trước" : "bản phát hành đầu"}) tại ${r.dir}.`);
    console.log(r.pushed ? "Đã đẩy lên repo template." : `Kiểm rồi đẩy:\n  ${r.pushCmd}`);
  } catch (e) {
    console.error(`DỪNG: ${e.message}`);
    process.exit(1);
  }
}
