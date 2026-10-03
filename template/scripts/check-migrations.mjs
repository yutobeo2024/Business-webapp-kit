// Chặn migration phá tương thích ngược mà không được đánh dấu là bước "contract".
//   node scripts/check-migrations.mjs        (CI chạy ở mọi PR)
// Vì sao: deploy lỗi thì hệ thống tự quay IMAGE về bản trước nhưng KHÔNG đảo migration. Nếu migration vừa xóa/đổi tên
// cột mà bản trước còn dùng, bản trước lỗi 500 trên schema mới trong khi health check vẫn xanh.
// Quy trình đúng (skill /db-migration): release N thêm cấu trúc mới (expand), release N+1 mới bỏ cấu trúc cũ (contract).
// Migration contract phải có dòng chú thích:  -- contract: <release đã ngừng dùng cấu trúc cũ, lý do>
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DESTRUCTIVE = [
  [/\bDROP\s+TABLE\b/i, "DROP TABLE"],
  [/\bDROP\s+COLUMN\b/i, "DROP COLUMN"],
  [/\bRENAME\s+(COLUMN|TO)\b/i, "RENAME"],
  [/\bSET\s+NOT\s+NULL\b/i, "SET NOT NULL"],
  [/\bALTER\s+COLUMN\b[^;]*\b(SET\s+DATA\s+)?TYPE\b/i, "ALTER COLUMN TYPE"],
  [/\bDROP\s+TYPE\b/i, "DROP TYPE"],
];
const CONTRACT_MARK = /^\s*--\s*contract:\s*\S+/im;

/** Danh sách thao tác phá tương thích trong một file migration; rỗng nếu an toàn hoặc đã đánh dấu contract. */
export function findUnmarkedDestructive(sql) {
  if (CONTRACT_MARK.test(sql)) return [];
  // Bỏ chú thích và chuỗi để không bắt nhầm chữ trong comment hay dữ liệu.
  const code = sql.replace(/--.*$/gm, "").replace(/'(?:[^']|'')*'/g, "''");
  return DESTRUCTIVE.filter(([re]) => re.test(code)).map(([, label]) => label);
}

function main() {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "packages", "db", "migrations");
  let failed = false;
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    const found = findUnmarkedDestructive(readFileSync(join(dir, file), "utf8"));
    if (found.length === 0) continue;
    failed = true;
    console.error(
      `${file}: ${found.join(", ")} phá tương thích với bản đang chạy (rollback image sẽ lỗi).\n` +
        "  Tách expand/contract theo /db-migration. Nếu đây đúng là bước contract, thêm dòng:\n" +
        "  -- contract: <release đã ngừng dùng cấu trúc cũ, lý do>",
    );
  }
  if (failed) process.exit(1);
  console.log("check-migrations: không có migration phá tương thích chưa đánh dấu");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
