# Business Web App Kit

Bộ khởi tạo production cho web app quy trình nghiệp vụ giao cho doanh nghiệp, làm việc cùng Claude Code.
Phiên bản kit: 1.0.0 (02/10/2026).

## Kit gồm gì

| Phần | Nội dung | Vị trí trong `template/` |
|---|---|---|
| Skeleton chạy được | NestJS 12 + React 19 + PostgreSQL 17 + Redis/BullMQ, đăng nhập session, module mẫu có state machine, phân quyền, audit | `apps/`, `packages/` |
| Kiểm thử | 35 unit, 17 tích hợp trên DB thật, E2E Playwright | `*.spec.ts`, `*.int.spec.ts`, `e2e/` |
| CI/CD | Kiểm tra mọi PR; merge main -> staging; tag -> production có người duyệt; rollback một nút | `.github/workflows/` |
| Hạ tầng | Dockerfile 3 app, Compose production, Caddy HTTPS tự động | `infra/` |
| Vận hành | Deploy tự rollback, sao lưu, khôi phục, diễn tập, cảnh báo, chuẩn bị server | `infra/*.sh` |
| Bảo trì | Quét lỗ hổng hằng tuần, Dependabot, 7 runbook | `.github/`, `docs/runbooks/` |
| Lớp Claude Code | CLAUDE.md ngắn, 6 rule theo đường dẫn, 8 skill, 1 subagent, 4 hook có bộ tự kiểm 60 tình huống | `CLAUDE.md`, `.claude/` |

Chi tiết lựa chọn stack: [docs/STACK.md](docs/STACK.md). Kiểm chứng đã làm: [docs/VERIFICATION.md](docs/VERIFICATION.md).
Trước khi giao khách: [template/docs/PRODUCTION-CHECKLIST.md](template/docs/PRODUCTION-CHECKLIST.md) (có sẵn trong mỗi dự án tạo ra).

## Bắt đầu dự án mới

```bash
./install.sh ~/projects/ten-du-an          # macOS, Linux, Git Bash
.\install.ps1 C:\projects\ten-du-an         # Windows PowerShell
```

Sau đó trong thư mục dự án: làm theo `README.md` của dự án (cài, chạy dev), sửa phần `<...>` trong `CLAUDE.md`,
rồi kiểm `pnpm verify:quick` và `pnpm claude:selftest` đều xanh. Mở Claude Code, gõ `/hooks` để thấy 4 hook đã được nạp.

Dự án đầu tiên: giữ module mẫu `purchase-requests` làm khuôn cho đến khi có module thật đầu tiên, rồi xóa module mẫu,
spec `001`, migration mẫu (tạo lại migration `init` từ schema thật).

## Quy trình làm việc hằng ngày

1. Khách gửi yêu cầu: `/business-flow <mô tả hoặc file>`. Claude hỏi lại, viết spec. Bạn duyệt với khách.
2. Code: `/feature docs/specs/NNN-xxx.md`. Claude trình kế hoạch lát cắt, bạn đồng ý, Claude làm từng lát.
   Hook tự format, lint sau mỗi lần sửa và chặn báo "xong" khi test còn đỏ.
3. Đổi DB: `/db-migration`. Đụng bảo mật: `/security-audit`. Trước PR: subagent `code-reviewer`.
4. Phát hành: `/release minor`, bạn tự tag và push, duyệt deploy trên GitHub.
5. Sự cố: `/incident`. Nâng thư viện: `/upgrade-deps`. Nghiệm thu: `/handover`.

## Ba lớp bảo vệ trong Claude Code

1. **CLAUDE.md + rules**: hướng dẫn, AI thường tuân theo nhưng không bắt buộc.
2. **Permission (allow / ask / deny)** trong `.claude/settings.json`: Claude Code cưỡng chế, kể cả ở auto mode.
3. **Hook**: code chạy thật, chặn lệnh phá dữ liệu (cả PowerShell), khóa file secret, migration đã commit, CI và hạ tầng;
   format/lint ngay khi sửa; chặn kết thúc khi `verify:quick` đỏ.

Giới hạn cần biết: deny rule và hook đọc nội dung lệnh, nên một script Node/Python tự mở file vẫn đọc được `.env`.
Khi cần cách ly ở mức hệ điều hành, bật sandbox của Claude Code hoặc chạy trong dev container.

## Bảo trì chính kit này

- Phải nhắc AI cùng một điều lần thứ hai: thêm vào rule đúng đường dẫn, không nhồi vào CLAUDE.md.
- AI làm hỏng thứ không được hỏng: biến thành hook, thêm tình huống vào `.claude/hooks/selftest.mjs`.
- Mỗi quý: `/upgrade-deps`, chạy `/doctor prompt-audit` trong Claude Code để tìm hướng dẫn lỗi thời, cập nhật CHANGELOG của kit.
