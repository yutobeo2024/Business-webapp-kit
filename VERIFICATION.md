# Báo cáo kiểm chứng kit 1.0.0

Kiểm ngày 02/10/2026 trên Ubuntu 24.04, Node 22.22, pnpm 10.34, PostgreSQL 16 và Redis 7 thật.
Nguyên tắc: không coi là xong khi chỉ đọc lại mã. Mọi phần đều được chạy bằng công cụ hoặc dữ liệu thật.

## Vòng 1: Kiểm tĩnh
| Hạng mục | Công cụ | Kết quả |
|---|---|---|
| Định dạng toàn repo | prettier --check | Sạch |
| 5 workflow GitHub Actions | actionlint 1.7.7 (kèm shellcheck cho khối `run`) | Sạch |
| YAML | yamllint | Sạch |
| 7 script vận hành + install.sh | shellcheck 0.11 | Sạch |
| 3 Dockerfile | hadolint 2.12 | Sạch |
| 2 Caddyfile | caddy validate 2.10 | Hợp lệ |
| 3 file Compose | docker compose config 2.39 | Hợp lệ; thiếu biến bắt buộc thì báo lỗi; chỉ Caddy mở cổng, PostgreSQL và Redis không lộ |
| Frontmatter 8 skill, 6 rule, 1 agent | parser YAML + đối chiếu trường hợp lệ theo tài liệu Claude Code | Hợp lệ |

## Vòng 2: Cài mới từ đầu
`install.sh` vào thư mục trống -> `pnpm install --frozen-lockfile` -> build -> `verify:quick` -> `claude:selftest`.
Kết quả: lint, typecheck sạch; 35 unit test xanh; tự kiểm hook 60/60; tổng 100 giây.

## Vòng 3: Chạy thật
- 17 test tích hợp xanh trên PostgreSQL + Redis thật: luồng duyệt đủ bước, ngưỡng giám đốc, sai version, hai người duyệt đồng thời
  (chỉ một thắng), phạm vi dữ liệu (404), CSRF, rate limit 429, khóa tài khoản, cookie HttpOnly/SameSite, đăng xuất.
- Migrate, seed (chạy lại không trùng; production từ chối tài khoản demo).
- API + worker + frontend build qua proxy: tạo, gửi, từ chối thiếu lý do, ngưỡng 45 triệu sang giám đốc, gửi lại version cũ,
  giám đốc từ chối, sửa lại. Audit đủ 5 bước, worker nhận đủ job, 0 lỗi 500, dừng an toàn bằng SIGTERM.

## Vòng 4: Image production (mô phỏng từng lệnh Dockerfile)
Build context theo `.dockerignore` -> `turbo prune` -> cài frozen lockfile -> build -> `pnpm deploy --prod` cho api, worker, web.
Chạy chính artifact: lệnh migrate của Compose, lệnh seed của runbook, `CMD` của image, `HEALTHCHECK`. Gói api 69 MB, worker 45 MB,
không có dependency dev. Caddy web: SPA deep link 200, source map 404, cache đúng cho assets và index.html.

## Vòng 5: Script vận hành và tính nhất quán
Docker giả lập gọi `pg_dump`, `pg_restore`, `psql` thật. 15 tình huống đạt: sao lưu (checksum, remote, từ chối nhãn độc hại),
deploy lần đầu, tự rollback khi health hỏng / container không healthy / migration lỗi, từ chối tag độc hại, khóa chống deploy
song song, khôi phục đúng dữ liệu và từ chối file sai checksum, diễn tập khôi phục, cảnh báo không spam.
Kiểm tự động 75 lệnh pnpm và 85 đường dẫn được nhắc trong 45 file tài liệu, skill, workflow: đều tồn tại.

Hook Claude Code kiểm hành vi thật: chặn 36 lệnh Bash và 5 lệnh PowerShell nguy hiểm, cho qua lệnh an toàn; khóa file secret,
lockfile, hạ tầng, migration đã commit; post-edit bắt lỗi lint thật và tự format; stop-verify chặn khi lỗi type, tự nhả sau 3 lần.

## Lỗi thật đã phát hiện và sửa nhờ kiểm chứng
1. `turbo prune` bỏ sót tsconfig gốc: image không build được. Sửa: package `@app/tsconfig`.
2. npm đóng gói theo `.gitignore` nên mất `dist`, `migrations`. Sửa: khai báo `files`.
3. `pnpm deploy` của pnpm 10 cần `--legacy` khi không inject workspace.
4. Hook post-edit không tìm thấy eslint (package không export bin) và **âm thầm bỏ qua lint**. Sửa cách tìm bin, thiếu công cụ thì báo to.
5. Script `pnpm db:seed` trỏ nhầm package: seed không tạo tài khoản, hỏng E2E trên CI và bước seed production.
6. Thư mục `out/` tồn đọng lọt vào build context làm image mang thừa app và cài lockfile thất bại. Sửa: `.dockerignore`, Dockerfile xóa `out`.
7. `index.html` không nhận `no-cache` qua đường dẫn SPA: người dùng có thể thấy trang trắng sau deploy. Sửa matcher Caddy.
8. Bước CI "migration khớp schema" ban đầu không phát hiện được quên sinh migration. Sửa và chạy thử cả hai trường hợp.
9. Test tích hợp dùng chung Redis với dev. Sửa: bắt buộc DB index riêng, kèm chốt từ chối chạy trên DB không có đuôi `_test`.
10. Biến `IMAGE_PREFIX` không bắt buộc cho api/worker. Sửa trong Compose.
11. Source map frontend bị phục vụ công khai. Sửa: Caddy trả 404.
12. Skill `security-review` trùng lệnh có sẵn của Claude Code. Đổi thành `security-audit`.

## Chưa kiểm được trong môi trường này (cần kiểm ở dự án đầu tiên)
| Hạng mục | Lý do | Cách kiểm |
|---|---|---|
| `docker build` và chạy container thật | Không có Docker daemon; đã mô phỏng từng lệnh | `docker build -f infra/docker/api.Dockerfile .` trên máy có Docker |
| Workflow chạy thật trên GitHub | Chỉ kiểm tĩnh bằng actionlint | Push repo, xem tab Actions |
| E2E Playwright | Không tải được trình duyệt; spec đã typecheck | Job `e2e` trên CI hoặc `pnpm test:e2e` ở máy dev |
| Hook trong phiên Claude Code thật | Không có phiên Claude Code; cấu hình theo tài liệu chính thức và bộ tự kiểm | Gõ `/hooks` và thử yêu cầu Claude chạy `git push --force` |
| Hook trên Windows | Kiểm trên Linux; đường dẫn đã xử lý dấu `\` | `pnpm claude:selftest` trên Windows |
| Tag image gitleaks v8.24.2, trivy 0.62.1 | Docker Hub bị chặn | Lần chạy CI đầu; cập nhật biến `GITLEAKS_VERSION`, `TRIVY_VERSION` nếu cần |
| Node 24, PostgreSQL 17 | Môi trường có Node 22.22, PostgreSQL 16 | CI dùng Node theo `.nvmrc` và image PostgreSQL 17 |
