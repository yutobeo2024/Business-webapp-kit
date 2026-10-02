# Nhật ký thay đổi của kit

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
