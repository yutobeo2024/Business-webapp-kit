// Tiện ích dùng chung cho hook. Hook nhận JSON qua stdin.
// Quy ước Claude Code: exit 0 = cho qua; exit 2 = chặn (PreToolUse/Stop) hoặc báo lại cho Claude (PostToolUse), nội dung qua stderr.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

export function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

export function block(message) {
  process.stderr.write(String(message).trim() + "\n");
  process.exit(2);
}

export function pass() {
  process.exit(0);
}

export function projectDir(input = {}) {
  return process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
}

/** Đường dẫn tương đối so với gốc dự án, dạng POSIX. Trên Windows file_path đến với dấu "\". */
export function relPath(filePath, root) {
  const abs = isAbsolute(filePath) ? filePath : join(root, filePath);
  return relative(root, abs).split("\\").join("/");
}

export function isGitTracked(rel, root) {
  const r = spawnSync("git", ["ls-files", "--error-unmatch", "--", rel], { cwd: root, stdio: "ignore" });
  return r.status === 0;
}

export function tail(text, lines) {
  return String(text || "")
    .trim()
    .split("\n")
    .slice(-lines)
    .join("\n");
}
