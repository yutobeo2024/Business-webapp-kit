// PreToolUse (Edit, Write, MultiEdit, NotebookEdit): bảo vệ file nhạy cảm và chính cơ chế bảo vệ.
import { block, isGitTracked, pass, projectDir, readInput, relPath } from "./_lib.mjs";

const input = readInput();
const raw = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path;
if (!raw) pass();
const root = projectDir(input);
const rel = relPath(raw, root);

if (rel.startsWith("../")) {
  block(`Không sửa file ngoài dự án: ${raw}`);
}
if (/(^|\/)\.env(\.[^/]+)?$/.test(rel) && !rel.endsWith(".env.example")) {
  block(`Không sửa ${rel}: file chứa secret. Chỉ sửa .env.example (giá trị mẫu, không phải secret thật).`);
}
// Migration đã commit có thể đã chạy trên staging/production: sửa lại sẽ làm lệch schema giữa các môi trường.
// Migration mới tạo (chưa commit, ví dụ từ drizzle-kit generate --custom) vẫn được điền nội dung.
if (rel.startsWith("packages/db/migrations/") && isGitTracked(rel, root)) {
  block(
    `Không sửa migration đã commit: ${rel}. Tạo migration mới bằng: pnpm db:generate --name <ten_thay_doi>`,
  );
}
if (/(^|\/)pnpm-lock\.yaml$/.test(rel)) {
  block("Không sửa tay pnpm-lock.yaml. Đề nghị người dùng chạy pnpm add/remove.");
}
if (/^\.claude\/(hooks\/|settings\.json$)/.test(rel)) {
  block(`Không sửa ${rel}: đây là cơ chế bảo vệ của dự án. Trình bày thay đổi đề xuất để người dùng tự sửa.`);
}
if (rel.startsWith(".git/")) {
  block("Không sửa nội bộ thư mục .git.");
}
if (/^(\.github\/workflows\/|infra\/)/.test(rel) && process.env.ALLOW_INFRA_EDIT !== "1") {
  block(
    `Không tự sửa ${rel} (CI/CD, hạ tầng production). Trình bày thay đổi đề xuất. ` +
      "Người dùng có thể mở phiên với ALLOW_INFRA_EDIT=1 nếu muốn giao việc này.",
  );
}
pass();
