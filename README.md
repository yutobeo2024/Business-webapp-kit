# Business Web App Kit

Bộ khởi tạo production cho web app quy trình nghiệp vụ giao cho doanh nghiệp, làm việc cùng Claude Code.
Phiên bản kit: 1.7.0 (05/10/2026). Thay đổi: [CHANGELOG.md](CHANGELOG.md).

## Kit gồm gì

| Phần | Nội dung | Vị trí trong `template/` |
|---|---|---|
| Skeleton chạy được | NestJS 12 + React 19 + PostgreSQL 17 + Redis/BullMQ, đăng nhập session, module mẫu có state machine, phân quyền, audit | `apps/`, `packages/` |
| Lõi quản trị | Phân quyền động (quyền trong mã, vai trò cấu hình trên giao diện), quản lý người dùng, vai trò, phòng ban, mật khẩu tạm, mẫu danh sách tìm/lọc/sắp xếp | `apps/api/src/modules/admin`, `apps/web/src/features/admin` |
| Lõi thông báo và nhập Excel | Thông báo trong app, email (SMTP), Zalo ZNS theo quyền người nhận, cài đặt kênh theo người; nhập Excel hai bước tất cả hoặc không | `packages/server/src/{notifications,imports}`, `apps/worker/src/{notifications,imports}` |
| Lõi tệp và xuất file | Đính kèm (kiểm loại theo nội dung, lưu đĩa qua interface sẵn sàng cho S3), xuất Excel/PDF chạy nền trong worker cùng phạm vi xem với màn hình, sao lưu tệp | `packages/server`, `apps/api/src/files`, `apps/api/src/modules/exports`, `apps/worker/src/exports` |
| Kiểm thử | Unit, tích hợp trên DB thật, E2E Playwright (đăng nhập một lần mỗi vai trò), kiểm script vận hành bằng docker giả; test lõi không phụ thuộc module mẫu | `*.spec.ts`, `*.int.spec.ts`, `e2e/`, `tests/infra/` |
| CI/CD | Kiểm tra mọi PR; merge main -> staging; tag -> production có người duyệt; rollback một nút | `.github/workflows/` |
| Hạ tầng | Dockerfile 3 app, Compose production, Caddy HTTPS tự động | `infra/` |
| Vận hành | Deploy tự rollback, sao lưu, khôi phục, diễn tập, cảnh báo, chuẩn bị server | `infra/*.sh` |
| Bảo trì | Quét lỗ hổng hằng tuần, Dependabot, 7 runbook | `.github/`, `docs/runbooks/` |
| Lớp Claude Code | CLAUDE.md ngắn, 6 rule theo đường dẫn, 8 skill, 1 subagent, 4 hook có bộ tự kiểm (`pnpm claude:selftest`) | `CLAUDE.md`, `.claude/` |

Chi tiết lựa chọn stack: [docs/STACK.md](docs/STACK.md). Kiểm chứng đã làm: [docs/VERIFICATION.md](docs/VERIFICATION.md).
Trước khi giao khách: [template/docs/PRODUCTION-CHECKLIST.md](template/docs/PRODUCTION-CHECKLIST.md) (có sẵn trong mỗi dự án tạo ra).

## Bắt đầu dự án mới

Cách 1, trên GitHub: mở repo [Business-webapp-template](https://github.com/yutobeo2024/Business-webapp-template),
bấm "Use this template" (chọn Private cho dự án khách), clone về rồi chạy một lần:

```bash
pnpm project:setup     # kiểm Node 22/24, tạo .env với DB và Redis riêng theo tên thư mục dự án
```

Cách 2, dòng lệnh từ bản clone repo kit này:

```bash
./install.sh ~/projects/ten-du-an          # macOS, Linux, Git Bash
.\install.ps1 C:\projects\ten-du-an         # Windows PowerShell
```

Hai cách cho cùng một dự án (repo template là nội dung `template/` của bản kit đã phát hành, kèm `.kit.json`).

Sau đó trong thư mục dự án: làm theo `README.md` của dự án (cài, chạy dev), sửa phần `<...>` trong `CLAUDE.md`,
rồi kiểm `pnpm verify:quick` và `pnpm claude:selftest` đều xanh. Mở Claude Code, gõ `/hooks` để thấy 4 hook đã được nạp.

Module mẫu `purchase-requests` (phiếu đề nghị, spec `001`) chỉ để học cách viết module. Trước module thật đầu tiên:
`pnpm sample:remove` (commit riêng; `/feature` tự đề xuất làm ở lát 0). Lệnh xóa tệp của mẫu theo
`scripts/sample-manifest.json`, cắt các khối đánh dấu `sample`, sinh migration xóa bảng mẫu, kiểm không còn tham chiếu
rồi chạy `verify:quick`. Chỉ dùng trước lần phát hành đầu tiên (lệnh tự dừng nếu `docs/runbooks/releases/` có ghi chép).
Lõi quản trị (spec `000`), tệp và xuất file (`002`), thông báo và nhập Excel (`003`) giữ lại, kèm bộ test riêng.

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

Giới hạn cần biết: deny rule và hook đọc nội dung lệnh, nên một script Node/Python tự mở file (`node -e`, `python -c`)
vẫn đọc được `.env` hoặc ghi vào file được bảo vệ.
Khi cần cách ly ở mức hệ điều hành, bật sandbox của Claude Code hoặc chạy trong dev container.

## Nâng cấp dự án đã tạo lên bản kit mới

```bash
node scripts/kit-sync.mjs <thư-mục-dự-án> --dry-run   # xem trước: tệp nào lấy bản kit, trộn, xung đột
node scripts/kit-sync.mjs <thư-mục-dự-án>             # làm trên nhánh kit-sync/<từ>-<lên> của dự án, không commit
```

Rồi mở Claude Code trong dự án, chạy `/kit-upgrade`: giải xung đột (lõi theo kit, nghiệp vụ của dự án giữ), sinh
migration từ schema đã trộn, chạy kiểm tra. Phiên bản kit của dự án ghi trong `.kit.json` (installer tạo); dự án cũ
hơn 1.5.0 không có tệp này thì công cụ đọc từ commit đầu hoặc `--from X.Y.Z`. Mỗi bản kit có tag `kit-vX.Y.Z`.
Công cụ không chép migration của kit (sinh lại trong dự án), không đụng `.env`, lockfile; tệp bị hook bảo vệ mà xung
đột thì để bản kit cạnh bên (`.kit-X.Y.Z`) cho người trộn.

## Bảo trì chính kit này

- Phải nhắc AI cùng một điều lần thứ hai: thêm vào rule đúng đường dẫn, không nhồi vào CLAUDE.md.
- AI làm hỏng thứ không được hỏng: biến thành hook, thêm tình huống vào `.claude/hooks/selftest.mjs`.
- Phát hành bản kit: cập nhật CHANGELOG (có mục "Nâng cấp dự án tạo từ ..."), `VERSION` trong hai installer, gắn tag
  `kit-vX.Y.Z` (không dùng `vX.Y.Z`: `sample:remove` coi đó là dự án đã phát hành), đẩy nhánh và tag, rồi
  `node scripts/publish-template.mjs X.Y.Z` để đưa bản đó sang repo template (script in lệnh đẩy; mỗi bản một commit).
- CI của kit (`.github/workflows/kit-ci.yml`) chạy bộ kiểm của template trên hai biến thể: còn module mẫu và sau
  `pnpm sample:remove`; thêm cài dự án bằng `install.sh`, build 3 image + trivy image + in PDF thử. Phải xanh trước khi
  phát hành bản kit.
- Sửa module mẫu hay thêm chỗ đăng ký mới của nó vào lõi: đánh dấu `// sample:begin` ... `// sample:end` (hoặc dòng
  `// sample`), tệp riêng của mẫu ghi vào `scripts/sample-manifest.json`; kit-ci bắt chỗ quên.
- Mỗi quý: `/upgrade-deps`, chạy `/doctor prompt-audit` trong Claude Code để tìm hướng dẫn lỗi thời, cập nhật CHANGELOG của kit.
