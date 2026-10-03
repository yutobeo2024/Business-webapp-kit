# Nhật ký thay đổi của kit

## 1.1.0 (03/10/2026)

Bước 2a: lõi quản trị dùng chung cho mọi dự án. Spec: `template/docs/specs/000-quan-tri-nguoi-dung.md`, ADR-0004.

Thêm

- Phân quyền động: quyền khai báo trong mã (mỗi module tự khai báo), vai trò là tập quyền do quản trị viên cấu hình trên
  giao diện; một người nhiều vai trò; đổi vai trò có hiệu lực ngay. `can()`, `@RequirePermission`, `PermissionGuard`.
- Quản trị người dùng, vai trò, phòng ban (API + giao diện) với chốt chặn: quyền quản trị chỉ người đang có mới cấp được và
  không thao tác được trên tài khoản mạnh hơn mình; luôn còn người quản trị; vai trò hệ thống bảo vệ; không tự khóa mình;
  khóa/đặt lại mật khẩu thu hồi phiên; audit không chứa mã băm.
- Mật khẩu tạm bắt đổi ở lần đăng nhập đầu, tự đổi mật khẩu (thu hồi phiên khác), chính sách mật khẩu dùng chung.
- Mẫu danh sách dùng chung: tìm kiếm, lọc, sắp xếp (chỉ cột cho phép), phân trang, bộ lọc nằm trên URL; component
  `DataTable`, `SortTh`, `Pagination`, `SearchInput`, `Select`, `Checkbox`, `Badge`, `Dialog`, `ConfirmDialog` (không thêm
  thư viện). Danh sách phiếu mẫu dùng mẫu này; hộp thoại xác nhận thay `window.confirm/prompt`.
- Lớp agent: CLAUDE.md mục "Lõi có sẵn", rule backend/frontend/security/database, skill `/feature` và mẫu spec ghi quyền
  thay cho bảng vai trò, code-reviewer kiểm phân quyền.

Thay đổi phá tương thích (dự án tạo từ 1.0.x)

- Bỏ enum vai trò (`ROLES`, `users.role`, `PR_CREATOR_ROLES`); `CurrentUser` có `roles`, `permissions`,
  `mustChangePassword` thay cho `role`. Migration `0000_init` được tạo lại: dự án đã chạy thật cần viết migration chuyển
  dữ liệu (tạo bảng vai trò, gán vai trò theo `users.role` cũ rồi mới bỏ cột).
- `loginSchema` không còn đòi mật khẩu tối thiểu 8 ký tự khi đăng nhập (chính sách áp dụng lúc đặt mật khẩu).

## 1.0.2 (03/10/2026)

Sửa các lỗi mức Medium còn lại từ review 1.0.0 và vài lỗi mới lộ ra khi kiểm thật. Mỗi mục có test tái hiện.

Ứng dụng

- Sửa: tài khoản bị khóa trả mã 423 làm lộ email nào tồn tại; nay mọi lần đăng nhập thất bại trả cùng một thông báo 401.
- Sửa: phiên không có hạn tuyệt đối (thêm `SESSION_MAX_DAYS`, mặc định 7 ngày) và cookie không được gia hạn theo phiên.
- Sửa: phiếu do trưởng phòng lập bị kẹt vĩnh viễn (BR-08: gửi thẳng giám đốc); Giám đốc, Quản trị không lập phiếu;
  spec mẫu và seed khớp với mã.
- Sửa: Redis mất kết nối làm request đã ghi DB bị treo (`enqueueAfterCommit` có giới hạn thời gian).
- Sửa: worker không kiểm payload job; PostgreSQL khởi động lại có thể làm tiến trình chết; body quá lớn trả 500;
  mã phiếu lấy năm theo UTC.
- Sửa (web): hết phiên không quay về trang đăng nhập; form không hiện lỗi ô số lượng, đơn giá; thông báo lỗi tiếng Anh.
- Thêm: `businessYear`, `prStatusChangedJobSchema`, `updatePurchaseRequestSchema`, `PR_CREATOR_ROLES` trong `@app/shared`.

Kiểm thử

- Sửa: `pnpm test:e2e` ở máy dev không chạy được (thiếu `webServer`, listener hộp thoại thừa). E2E AC-01 đã chạy thật.
- Thêm: `tests/infra/restore-real.sh` kiểm khôi phục trên PostgreSQL thật; `scripts/check-migrations.mjs`.

Vận hành và CI

- Sửa: khôi phục DB để sót bảng sinh sau bản sao lưu (lần phát hành sau lỗi); nay xóa sạch và nạp lại trong một
  transaction, file hỏng không đụng DB.
- Sửa: web trả `index.html` kèm cache vĩnh viễn cho file `/assets` không tồn tại; source map không tồn tại trả 200.
- Thêm: CI chặn migration phá tương thích chưa đánh dấu `-- contract:` (rollback chỉ quay image).
- Thay đổi: image nền ghim digest và action ghim SHA, cập nhật qua Dependabot; cảnh báo khi chưa có sao lưu ngoài máy
  chủ; dọn image cũ; khóa SSH của CI có `restrict`; quét hằng tuần hết báo lỗi giả.

Lớp Claude Code

- Sửa: `stop-verify` chạy lại verify ở mọi lượt và ép sửa lại từ đầu sau khi đã bó tay; thông báo bó tay không ai thấy.
- Sửa: allow rule có wildcard ở giữa cho phép chạy lệnh tùy ý; `/release` rà bảo mật trên một diff rỗng.
- Thêm: không cho đổi script `verify:quick`, `lint`, `typecheck`, `test`, `build` trong `package.json` gốc và của từng
  app/package, không cho sửa `turbo.json` (Edit, Write và shell).
- Sửa: mọi lần đăng nhập thất bại mất tối thiểu 200 ms (trước: dò được email tồn tại qua thời gian phản hồi).

Đã kiểm lại và bỏ: mục "thứ tự shutdown" trong review không phải lỗi (Nest đóng HTTP server trước khi đóng DB, Redis).

## 1.0.1 (02/10/2026)

Sửa các lỗi Critical/High tìm thấy khi review toàn bộ kit 1.0.0. Mỗi lỗi có test tái hiện (đỏ trên 1.0.0, xanh trên 1.0.1).
Dự án đã tạo từ 1.0.0 nên chép lại các file nêu dưới đây.

Vận hành (`infra/`)

- Sửa: deploy, cron sao lưu 02:00, `alert-check.sh`, `restore-db.sh` và lệnh tay trong runbook đều chết vì
  `compose.prod.yml` bắt buộc `APP_TAG` (`lib.sh` nay lấy mặc định từ `.deployed-tag`).
- Sửa: deploy lần đầu trên máy mới thất bại ở bước sao lưu (PostgreSQL chưa chạy).
- Sửa: tắt đăng nhập SSH bằng mật khẩu không có tác dụng trên ảnh cloud (`00-hardening.conf`, kiểm `sshd -T`).
- Sửa: hướng dẫn sinh secret bằng base64 làm hỏng `DATABASE_URL`/`REDIS_URL` (dùng `openssl rand -hex 32`).
- Thêm: `infra/dc.sh` cho lệnh compose tay; `tests/infra/run.sh` kiểm script bằng docker giả, chạy trong CI.
- Sửa: diễn tập khôi phục để lại volume chứa dữ liệu production; Uptime Kuma và dịch vụ dev chỉ nghe 127.0.0.1.

CI/CD (`.github/`)

- Sửa: tiêm lệnh vào shell trên máy chủ qua input `tag` của Rollback; Rollback chỉ chạy từ `main`, chạy từ nhánh
  khác thì báo lỗi rõ.
- Sửa: tag trỏ vào commit chưa vào `main` vẫn được deploy production.
- Thêm: kiểm bit +x của `infra/*.sh`; checklist giới hạn branch/tag cho environment và ruleset tag.

Ứng dụng

- Sửa: gửi song song nhiều request sai mật khẩu lách được giới hạn khóa tài khoản; request đoán đúng chạy song song
  không còn vượt qua khóa vừa đặt.
- Sửa: tổng tiền vượt 2^53 lưu sai hoặc lỗi 500. Thêm `vndSchema`, `isValidVnd`, `MAX_VND` trong `@app/shared`.
- Sửa: migration nặng bị hủy sau 30 giây (nay không giới hạn thời gian chạy, nhưng chờ khóa tối đa 15 giây);
  hướng dẫn `CREATE INDEX CONCURRENTLY` không chạy được với migrator drizzle.
- Sửa: `pnpm db:migrate` không nạp `.env`; Referer sai định dạng trả 500.

Lớp Claude Code

- Sửa: `guard-bash` bị lách dễ (`rm -r -f /`, `git push origin +x`, `cat .env;`, `sed -i` vào hook...), viết lại theo
  hướng tách lệnh; chặn nhầm `git push origin feat/main-menu`.
  Xét cả lệnh lồng (`$(...)` trong nháy kép, `bash -x -c`, `eval`, `pwsh -Command`), tiền tố có đối số
  (`sudo -u x`, `timeout 60`), escape (`r\m`), option git viết tắt (`--ha`, `--no-verif`), alias/`GIT_CONFIG_*`.
- Sửa: `protect-files` bị lách trên Windows (`.ENV`, `Infra/`, khác ổ đĩa, `.env::$DATA`); bảo vệ `settings.local.json`.
- Sửa: `protect-files` chặn cả file kế hoạch và memory của Claude Code ngoài dự án; nay cho `~/.claude/plans`,
  `~/.claude/projects` và thư mục tạm.
- Thay đổi: hook bảo vệ chặn khi input hỏng (fail-closed). Bộ tự kiểm từ 61 lên hơn 200 tình huống.
- Thêm: quy ước bộ đếm (khóa dòng) và tiền vào rule backend, CLAUDE.md.

Cài đặt

- Sửa: dự án tạo bằng `install.ps1`/`install.sh` trên Windows mất bit +x của script; `install.ps1` lỗi font tiếng Việt
  và không báo khi git thất bại.
- Thay đổi: `engines` chỉ nhận Node 22/24 LTS (máy dùng Node 25 phải cài Node 24, nếu không mọi lệnh `pnpm` dừng); `.dockerignore` loại `.env` mọi cấp; turbo không tự sinh `AGENTS.md`.
- Tài liệu: sửa ký tự hỏng, số liệu sai; bỏ bản trùng `STACK.md`, `VERIFICATION.md` ở gốc (bản chính trong `docs/`).

## 1.0.0 (02/10/2026)

Bản đầu: skeleton production, CI/CD, hạ tầng, vận hành, bảo trì, lớp Claude Code. Kiểm chứng: docs/VERIFICATION.md.
