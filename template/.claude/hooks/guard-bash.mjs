// PreToolUse (Bash, PowerShell): chặn lệnh phá dữ liệu hoặc vượt quy trình TRƯỚC khi chạy.
// Đây là luật cứng chạy bằng code, không phụ thuộc AI có nhớ CLAUDE.md hay không.
// Cách làm: tách chuỗi thành từng lệnh đơn (bỏ nháy; tách theo ; && || | $( ) ` xuống dòng), bỏ tiền tố
// (VAR=x, sudo, env, sh -c, đường dẫn binary), rồi xét tên lệnh và đối số ở MỌI vị trí.
// Một regex trên cả chuỗi bị lách quá dễ (rm -r -f /, git push origin +x, cat .env;...).
import { block, isGitTracked, pass, projectDir, readInputStrict, resolveTarget } from "./_lib.mjs";

const input = readInputStrict();
if (!input) block("guard-bash: không đọc được input của hook, chặn để an toàn.");
const cmd = String(input?.tool_input?.command ?? "");
if (!cmd.trim()) pass();
const root = projectDir(input);
const infraLocked = process.env.ALLOW_INFRA_EDIT !== "1";

// ---------- Tách lệnh ----------

/**
 * Danh sách lệnh đơn, mỗi lệnh là mảng token đã bỏ nháy ("/" chính là /). Nội dung trong nháy giữ nguyên một token
 * (dấu ; ( ) trong commit message hay biểu thức sed không cắt lệnh). Ghi ra file thành token ">" đứng trước file đích.
 */
function parse(text) {
  const cmds = [];
  let cur = [];
  let tok = "";
  let quoted = false;
  let quote = null;
  const endTok = () => {
    if (tok || quoted) cur.push(tok);
    tok = "";
    quoted = false;
  };
  const endCmd = () => {
    endTok();
    if (cur.length) cmds.push(cur);
    cur = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (quote) {
      if (c === quote) quote = null;
      else tok += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      quoted = true;
    } else if (c === "\\" && (n === "\n" || n === "\r")) {
      i++;
    } else if (c === "$" && n === "{") {
      const end = text.indexOf("}", i);
      tok += end < 0 ? text.slice(i) : text.slice(i, end + 1);
      i = end < 0 ? text.length : end;
    } else if ((c === "$" || c === "<" || c === ">") && n === "(") {
      endCmd(); // $( ), <( ), >( ): lệnh lồng
      i++;
    } else if (c === ">" && n === "&") {
      if (/^\d+$/.test(tok)) tok = ""; // 2>&1: nhân bản fd, không ghi file
      i++;
      while (/[\d-]/.test(text[i + 1] ?? "")) i++;
    } else if (c === ">") {
      if (/^\d+$/.test(tok)) tok = "";
      endTok();
      cur.push(">");
      while (text[i + 1] === ">" || text[i + 1] === "|") i++;
    } else if (/[;&|(){}`\r\n]/.test(c)) {
      endCmd();
    } else if (/\s/.test(c)) {
      endTok();
    } else {
      tok += c;
    }
  }
  endCmd();
  return cmds;
}

const base = (tok) =>
  tok
    .split(/[\\/]/)
    .pop()
    .toLowerCase()
    .replace(/\.exe$/, "");
const isAssign = (tok) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(tok);
const WRAPPERS = new Set([
  "sudo",
  "doas",
  "command",
  "builtin",
  "exec",
  "nohup",
  "time",
  "nice",
  "xargs",
  "stdbuf",
]);
const SHELLS = new Set(["sh", "bash", "zsh", "dash", "ksh", "pwsh", "powershell", "cmd"]);

/** Bỏ tiền tố không đổi bản chất lệnh. Trả ["env"] khi lệnh chỉ in biến môi trường. */
function unwrap(tokens) {
  let t = tokens;
  for (let guard = 0; guard < 10 && t.length; guard++) {
    const name = base(t[0]);
    if (isAssign(t[0])) {
      t = t.slice(1);
    } else if (WRAPPERS.has(name)) {
      t = t.slice(1);
      while (t[0]?.startsWith("-")) t = t.slice(1);
    } else if (name === "env") {
      let i = 1;
      while (i < t.length && (t[i].startsWith("-") || isAssign(t[i]))) i += t[i] === "-u" ? 2 : 1;
      if (i >= t.length) return ["env"];
      t = t.slice(i);
    } else {
      break;
    }
  }
  return t;
}

// ---------- Nhận diện ----------

const norm = (tok) => tok.replace(/\\/g, "/").toLowerCase();
const MAIN_BRANCHES = new Set(["main", "master", "production", "release"]);
const DELETE_CMDS = new Set(["rm", "remove-item", "ri", "del", "erase", "rd", "rmdir"]);

const isRecursive = (a) =>
  /^(--recursive|-r|-rec|-recurse|\/s)$/i.test(a) || (/^-[a-z]{2,4}$/i.test(a) && /r/i.test(a));

/** Thư mục gốc ổ đĩa, home, thư mục cha, cả thư mục hiện tại. */
function dangerousTarget(tok) {
  let p = norm(tok);
  if (/^(~|\$home|\$\{home\}|\$env:userprofile|\$env:homepath|%userprofile%)(\/|$)/.test(p)) return true;
  if (/^\.\.(\/|$)/.test(p)) return true;
  p = p
    .replace(/\/?\*$/, "")
    .replace(/\/+$/, "")
    .replace(/^\.\/$/, ".");
  return p === "" || p === "." || /^[a-z]:$/.test(p);
}

/** File .env chứa secret (kể cả .env.local, .env*, --env-file=.env); .env.example là mẫu, cho qua. */
function isEnvFile(tok) {
  const b = norm(tok).split(/[/=]/).pop();
  return /^\.env($|[.*?[])/.test(b) && b !== ".env.example";
}

/** Lý do nếu ghi vào file/thư mục này phá cơ chế bảo vệ; null nếu được ghi. */
function protectedReason(tok) {
  const t = tok.replace(/^[<>]+/, "").replace(/\\/g, "/");
  if (!t || t.startsWith("-") || /^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return null;
  const { rel, key, outside } = resolveTarget(t, root);
  if (outside) return null;
  if (key === ".claude" || /^\.claude\/(hooks(\/|$)|settings(\.local)?\.json$)/.test(key))
    return `${rel} là cơ chế bảo vệ của dự án (hook, settings).`;
  if (/(^|\/)pnpm-lock\.yaml$/.test(key)) return "pnpm-lock.yaml chỉ được đổi qua pnpm add/remove.";
  if (
    key === "packages/db/migrations" ||
    (key.startsWith("packages/db/migrations/") && isGitTracked(rel, root))
  )
    return `Không sửa migration đã commit (${rel}). Tạo migration mới.`;
  if (infraLocked && (key === ".github" || /^(infra|\.github\/workflows)(\/|$)/.test(key)))
    return `${rel} là CI/CD, hạ tầng production (cần ALLOW_INFRA_EDIT=1).`;
  return null;
}

// Lệnh ghi/xóa: mọi đối số là mục tiêu. Lệnh sao chép: chỉ đích (đối số cuối).
const WRITE_ALL = new Set([
  ...DELETE_CMDS,
  ...["tee", "truncate", "shred", "unlink", "ln", "chmod", "chown", "mv", "move", "move-item", "mi"],
  ...["set-content", "sc", "add-content", "ac", "out-file", "clear-content", "clc", "new-item", "ni"],
  ...["rename-item", "ren", "rni"],
]);
const WRITE_LAST = new Set(["cp", "copy", "copy-item", "cpi", "install", "rsync", "scp"]);

/** Các token là nơi lệnh sẽ ghi vào. */
function writeTargets(name, args) {
  const pos = args.filter((a) => !a.startsWith("-") && a !== ">");
  const out = [];
  args.forEach((a, i) => args[i - 1] === ">" && out.push(a));
  if (WRITE_ALL.has(name)) out.push(...pos);
  if (WRITE_LAST.has(name) && pos.length) out.push(pos[pos.length - 1]);
  if ((name === "sed" || name === "perl") && args.some((a) => /^-[a-z]*i/i.test(a) || a === "--in-place"))
    out.push(...pos);
  if (name === "dd") out.push(...args.filter((a) => a.startsWith("of=")).map((a) => a.slice(3)));
  if (name === "git" && /^(checkout|restore|rm|mv)$/.test(gitSub(args).sub)) out.push(...gitSub(args).pos);
  return out;
}

/** Bỏ option toàn cục của git (-C x, -c k=v) để biết lệnh con thật. */
function gitSub(args) {
  let i = 0;
  let hooksOff = false;
  while (i < args.length && args[i].startsWith("-")) {
    if (args[i] === "-c") {
      if (/^core\.hookspath=/i.test(args[i + 1] ?? "")) hooksOff = true;
      i += 2;
    } else if (/^(-C|--git-dir|--work-tree|--namespace|--exec-path)$/.test(args[i])) {
      i += 2;
    } else {
      i++;
    }
  }
  const rest = args.slice(i + 1);
  return {
    sub: (args[i] ?? "").toLowerCase(),
    flags: rest.filter((a) => a.startsWith("-")),
    pos: rest.filter((a) => !a.startsWith("-") && a !== ">"),
    hooksOff,
  };
}

function gitRule(args) {
  const { sub, flags, pos, hooksOff } = gitSub(args);
  const short = (ch) => flags.some((f) => /^-[a-z]+$/i.test(f) && f.includes(ch));
  if (hooksOff || (sub === "config" && args.some((a) => /^core\.hookspath$/i.test(a))))
    return "Không tắt git hook (core.hooksPath).";
  if (sub === "push") {
    if (
      flags.includes("--force") ||
      flags.includes("--mirror") ||
      short("f") ||
      pos.some((p) => p.startsWith("+"))
    )
      return "Force push bị cấm.";
    const toMain = pos.slice(1).some((r) => {
      const dst = r
        .split(":")
        .pop()
        .replace(/^refs\/heads\//, "");
      return MAIN_BRANCHES.has(dst.toLowerCase());
    });
    if (toMain || flags.includes("--all")) return "Không push thẳng lên nhánh chính. Tạo PR.";
  }
  if (sub === "reset" && flags.includes("--hard")) return "reset --hard làm mất thay đổi chưa commit.";
  if (sub === "clean" && (flags.includes("--force") || short("f")))
    return "git clean -f xóa file chưa track.";
  if (/^(checkout|restore|switch)$/.test(sub)) {
    if (pos.some((p) => [".", "./", "*", "./*", ":/", ":/*"].includes(p)))
      return "Lệnh này bỏ toàn bộ thay đổi đang làm.";
    if (sub !== "restore" && (flags.includes("--force") || short("f")))
      return "checkout -f bỏ thay đổi đang làm.";
  }
  if (sub === "commit" && short("n")) return "Không bỏ qua git hook (commit -n tương đương --no-verify).";
  return null;
}

/** Lý do chặn một lệnh đơn, null nếu cho qua. */
function checkCommand(tokens, depth = 0) {
  const t = unwrap(tokens);
  if (!t.length) return null;
  const name = base(t[0]);
  const args = t.slice(1);
  // bash -c '...', bash -lc, pwsh -Command, cmd /c: xét lệnh bên trong.
  if (SHELLS.has(name) && /^([-/][a-z]*c|-command)$/i.test(args[0] ?? "") && depth < 5) {
    for (const inner of parse(args.slice(1).join(" "))) {
      const r = checkCommand(inner, depth + 1);
      if (r) return r;
    }
    return null;
  }
  const pos = args.filter((a) => !a.startsWith("-") && !/^\/[a-z]$/i.test(a) && a !== ">");

  if (t.some(isEnvFile)) return "Không đọc hoặc chép file .env chứa secret.";
  if (
    name === "env" ||
    name === "printenv" ||
    (["set", "export", "declare"].includes(name) && pos.length === 0)
  )
    return "Không in biến môi trường (có thể chứa secret).";
  if (t.some((a) => /^env:/i.test(a))) return "Không liệt kê biến môi trường (PowerShell env:).";

  if (DELETE_CMDS.has(name) && args.some(isRecursive) && pos.some(dangerousTarget))
    return "Xóa đệ quy thư mục gốc, home, thư mục cha hoặc toàn bộ thư mục hiện tại.";
  if (
    name === "chmod" &&
    args.some((a) => /^-[a-z]*R/.test(a) || a === "--recursive") &&
    args.some((a) => /^(0?777|a\+rwx|ugo\+rwx)$/.test(a))
  )
    return "Phân quyền 777 đệ quy không an toàn.";

  if (name === "git") {
    const r = gitRule(args);
    if (r) return r;
  }
  if (["docker", "docker-compose", "podman", "dc.sh"].includes(name)) {
    if (pos.includes("down") && args.some((a) => a === "--volumes" || /^-[a-z]*v$/i.test(a)))
      return "down -v xóa volume dữ liệu.";
    if (
      (pos[0] === "volume" && /^(rm|prune)$/.test(pos[1] ?? "")) ||
      (pos[0] === "system" && pos[1] === "prune")
    )
      return "Lệnh xóa volume/dữ liệu Docker.";
  }
  if (["npm", "pnpm", "yarn", "bun"].includes(name) && pos.includes("publish"))
    return "Không publish package từ phiên AI.";

  const script = SHELLS.has(name) || name === "source" || name === "." ? base(pos[0] ?? "") : name;
  if (script === "deploy.sh" || script === "restore-db.sh")
    return "Deploy và khôi phục DB chỉ chạy qua CI hoặc do người vận hành chạy tay.";

  for (const target of writeTargets(name, args)) {
    const r = protectedReason(target);
    if (r) return `Không ghi qua shell: ${r}`;
  }
  return null;
}

// Luật trên cả chuỗi: cần thấy nhiều lệnh cùng lúc (tải rồi chạy) hoặc nội dung SQL.
const WHOLE = [
  [
    /\b(curl|wget|iwr|irm|invoke-webrequest|invoke-restmethod)\b[^\n]*\|\s*(sudo\s+)?((ba|z|da|k)?sh|python3?|node|perl|ruby|pwsh|powershell|iex|invoke-expression)\b/i,
    "Không chạy script tải từ internet qua pipe.",
  ],
  [/<\(\s*(curl|wget)\b/i, "Không chạy script tải từ internet."],
  [
    /\b(iex|invoke-expression)\b.*\b(irm|iwr|invoke-webrequest|invoke-restmethod|downloadstring|net\.webclient)\b/i,
    "Không chạy script tải từ internet (PowerShell).",
  ],
  [/\s-(e|ec|enc|encodedcommand)\s+[A-Za-z0-9+/=]{16,}/i, "Không chạy lệnh PowerShell đã mã hóa base64."],
  [/--no-verify\b/i, "Không bỏ qua git hook bằng --no-verify."],
  [/\/proc\/[^\s]*\/environ\b/i, "Không đọc biến môi trường của tiến trình."],
  [/getenvironmentvariables/i, "Không liệt kê biến môi trường."],
  [
    /\bdrizzle-kit\s+(push|drop)\b/i,
    "drizzle-kit push/drop bỏ qua lịch sử migration. Dùng pnpm db:generate rồi để CI/deploy áp dụng.",
  ],
  [/\bprisma\s+(migrate\s+reset|db\s+push)\b/i, "Lệnh phá lịch sử migration."],
  [
    /\b(drop\s+(database|schema|table)|truncate\s+(table\s+)?\w)/i,
    "Lệnh SQL phá dữ liệu. Phải đi qua migration có review.",
  ],
];

let reason = WHOLE.find(([re]) => re.test(cmd))?.[1] ?? null;
for (const tokens of parse(cmd)) {
  if (reason) break;
  reason = checkCommand(tokens);
}
if (reason) {
  block(
    `Lệnh bị chặn bởi .claude/hooks/guard-bash.mjs: ${reason}\nLệnh: ${cmd}\n` +
      "Nếu thật sự cần, dừng lại, giải thích lý do và đề nghị người dùng tự chạy.",
  );
}
pass();
