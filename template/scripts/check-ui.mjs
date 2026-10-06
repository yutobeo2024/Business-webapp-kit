// Giữ giao diện đi theo token (đổi thương hiệu và sáng/tối ở một chỗ):
//   node scripts/check-ui.mjs            liệt kê chỗ vi phạm trong apps/web/src, KHÔNG làm hỏng lệnh (cảnh báo)
//   node scripts/check-ui.mjs --strict   có vi phạm thì thoát mã 1 (bật trong CI của dự án khi các trang đã sạch)
// Báo: màu bảng Tailwind viết cứng (text-neutral-500, bg-red-600, bg-white), mã màu viết thẳng trong class
// (bg-[#fff]), và hộp thoại của trình duyệt (window.confirm/alert/prompt). Dùng tên token trong styles.css thay thế:
// bg-card, text-muted-foreground, border-border, text-destructive, text-success, bg-primary...
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PROPS =
  "bg|text|border|ring|outline|divide|fill|stroke|accent|decoration|from|via|to|shadow|caret|placeholder";
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const HARD_COLOR = new RegExp(
  `(?<![\\w-])(?:${PROPS})-(?:(?:${PALETTE})-\\d{2,3}|white|black|\\[(?:#|rgb|hsl|oklch)[^\\]]*\\])`,
  "g",
);
const BROWSER_DIALOG = /(?<![\w.])(?:(?:window|globalThis|self)\.)?(?:confirm|alert|prompt)\(/g;

/** Các chỗ vi phạm trong một tệp: `{ line, kind: "color" | "dialog", match }`. */
export function findIssues(source) {
  const issues = [];
  source.split(/\r?\n/).forEach((text, i) => {
    for (const m of text.matchAll(HARD_COLOR)) issues.push({ line: i + 1, kind: "color", match: m[0] });
    for (const m of text.matchAll(BROWSER_DIALOG)) issues.push({ line: i + 1, kind: "dialog", match: m[0] });
  });
  return issues;
}

function* sourceFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* sourceFiles(p);
    else if (/\.tsx?$/.test(e.name) && !/\.spec\.tsx?$/.test(e.name)) yield p;
  }
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const strict = process.argv.includes("--strict");
  let count = 0;
  for (const file of sourceFiles(join(root, "apps", "web", "src"))) {
    for (const i of findIssues(readFileSync(file, "utf8"))) {
      count++;
      const why =
        i.kind === "color"
          ? "màu viết cứng, dùng token (bg-card, text-muted-foreground, text-destructive...)"
          : "dùng ConfirmDialog/Dialog thay cho hộp thoại của trình duyệt";
      console.log(`${relative(root, file).replaceAll("\\", "/")}:${i.line}  ${i.match}  -> ${why}`);
    }
  }
  if (count === 0) return;
  console.log(
    `\ncheck-ui: ${count} chỗ chưa theo quy ước giao diện (.claude/rules/frontend.md, docs/ui.md).`,
  );
  if (strict) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
