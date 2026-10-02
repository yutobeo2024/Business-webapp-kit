// PreToolUse (Bash, PowerShell): chặn lệnh phá dữ liệu hoặc vượt quy trình TRƯỚC khi chạy.
// Đây là luật cứng chạy bằng code, không phụ thuộc AI có nhớ CLAUDE.md hay không.
import { block, pass, readInput } from "./_lib.mjs";

const input = readInput();
const cmd = String(input?.tool_input?.command ?? "");
if (!cmd) pass();

export const RULES = [
  // Xóa hàng loạt
  [
    /\brm\s+(-[a-z]*\s+)*-[a-z]*r[a-z]*\s+(\/|~|\.\.|\*|\/\*)(\s|$)/i,
    "Xóa đệ quy thư mục gốc, home, thư mục cha hoặc toàn bộ.",
  ],
  [
    /remove-item\b.*-recurse.*\s(['"]?([a-z]:)?[\\/]['"]?|~|\.\.)(\s|$)/i,
    "Xóa đệ quy thư mục gốc hoặc home (PowerShell).",
  ],
  [/\bchmod\s+-R\s+777\b/i, "Phân quyền 777 không an toàn."],
  // Database
  [
    /\bdrizzle-kit\s+(push|drop)\b/i,
    "drizzle-kit push/drop bỏ qua lịch sử migration. Dùng pnpm db:generate rồi để CI/deploy áp dụng.",
  ],
  [/\bprisma\s+(migrate\s+reset|db\s+push)\b/i, "Lệnh phá lịch sử migration."],
  [
    /\b(drop\s+(database|schema|table)|truncate\s+(table\s+)?\w)/i,
    "Lệnh SQL phá dữ liệu. Phải đi qua migration có review.",
  ],
  // Git
  [/\bgit\s+push\b.*(--force(?!-with-lease)|\s-f(\s|$))/i, "Force push bị cấm."],
  [/\bgit\s+push\b.*\b(main|master|production|release)\b/i, "Không push thẳng lên nhánh chính. Tạo PR."],
  [/\bgit\s+reset\s+--hard\b/i, "reset --hard làm mất thay đổi chưa commit."],
  [/\bgit\s+clean\s+-[a-z]*f/i, "git clean -f xóa file chưa track."],
  [/\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/i, "Lệnh này bỏ toàn bộ thay đổi đang làm."],
  [/--no-verify\b/i, "Không bỏ qua git hook bằng --no-verify."],
  // Secret
  [
    /\b(cat|less|more|head|tail|type|bat|grep|rg|sed|awk|get-content|gc|select-string)\b[^|;&]*\.env(\.(local|production|staging|development))?(\s|$|["'])/i,
    "Không đọc file .env chứa secret.",
  ],
  [/\b(printenv|env)\s*$/i, "Không in toàn bộ biến môi trường (có thể chứa secret)."],
  // Tải và chạy mã từ internet
  [/\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b/i, "Không chạy script tải từ internet qua pipe."],
  [
    /\b(iwr|invoke-webrequest|irm|invoke-restmethod)\b.*\|\s*(iex|invoke-expression)\b/i,
    "Không chạy script tải từ internet (PowerShell).",
  ],
  // Phát hành, hạ tầng
  [/\b(npm|pnpm|yarn)\s+publish\b/i, "Không publish package từ phiên AI."],
  [/\bdocker\s+(compose\s+)?.*\bdown\b.*\s-v\b/i, "down -v xóa volume dữ liệu."],
  [/\bdocker\s+(volume\s+(rm|prune)|system\s+prune)\b/i, "Lệnh xóa volume/dữ liệu Docker."],
  [
    /(^|[\s/])(deploy|restore-db)\.sh\b/i,
    "Deploy và khôi phục DB chỉ chạy qua CI hoặc do người vận hành chạy tay.",
  ],
];

for (const [re, reason] of RULES) {
  if (re.test(cmd)) {
    block(
      `Lệnh bị chặn bởi .claude/hooks/guard-bash.mjs: ${reason}\nLệnh: ${cmd}\n` +
        "Nếu thật sự cần, dừng lại, giải thích lý do và đề nghị người dùng tự chạy.",
    );
  }
}
pass();
