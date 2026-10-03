# Báo cáo kiểm chứng kit

## 1.0.2: lỗi mức Medium và kiểm thật các phần chưa từng chạy (03/10/2026)

Danh sách sửa đổi: [CHANGELOG.md](../CHANGELOG.md). Test viết trước, đỏ trên 1.0.1:

| Nhóm | Test tái hiện | Kết quả trên 1.0.2 |
|---|---|---|
| Phiên, khóa tài khoản, BR-08, hàng đợi treo, body quá lớn | 8 test tích hợp mới (`http.int.spec.ts`, `purchase-requests.int.spec.ts`) | 26/26 |
| State machine BR-08, năm theo giờ Việt Nam, thông báo ô số, payload job, 401 toàn cục ở web | 13 unit test mới | 51/51 |
| Script vận hành (cảnh báo sao lưu ngoài, khôi phục) | `tests/infra/run.sh` | 16/16 (15 trên Linux, không có ca compose thật) |
| Hook (stop-verify, bảo vệ `package.json`, ghi qua option) | `pnpm claude:selftest` | 249/249 trên Windows |

Những phần lần đầu được chạy THẬT, và lỗi chúng bắt được:
- **Khôi phục DB trên PostgreSQL 17** (`tests/infra/restore-real.sh`): cách viết đầu tiên của bản sửa (nối thẳng
  `pg_restore | psql`) báo thành công với file sao lưu hỏng và để lại DB trống. Đã đổi sang hai bước, test giữ lại trong CI.
- **Caddy của image web**: luật 404 cho source map và asset không tồn tại không có tác dụng vì Caddy xếp `try_files`
  trước `respond` (1.0.0 ghi "source map 404" nhưng chỉ đúng với file có thật). Đã sửa bằng `route`, kiểm trên image đã build.
- **E2E Playwright** (AC-01): chạy xanh trên máy dev với `webServer` tự khởi động API và web preview.
- **Image production**: build lại cả ba; `web` trả đúng mã và cache; `api` lên `healthy`, chấp nhận `APP_ORIGIN` có `/` cuối.
- Cài sạch trên Linux `node:24-bookworm` với `engine-strict`: format, build, verify, selftest, tích hợp, hạ tầng,
  kiểm migration, migration khớp schema đều xanh. Hai trình cài chạy lại trên PowerShell 5.1 và Git Bash.

Còn chưa kiểm: workflow chạy thật trên GitHub (chỉ actionlint), hook trong một phiên Claude Code thật, script vận hành
trên máy chủ thật.

Một agent độc lập rà diff của bản này và tìm thêm 13 điểm (không có lỗi chặn), đã sửa: dò email qua thời gian phản hồi
(đo thật: chênh 6 ms giữa các nhánh; nay mọi lần thất bại mất tối thiểu 200 ms), lách bảo vệ script bằng
`pnpm -C . pkg set` và qua `package.json` của từng app, `stop-verify` không chặn khi repo chưa có commit và file
trạng thái tự ghi được, `check-migrations` bắt nhầm cột tên `type` và bắt sót `ADD COLUMN NOT NULL`, `APP_ORIGIN`
thiếu scheme thành chuỗi `null`, cache của người dùng cũ sau 401, quyền schema sau khôi phục, vài chỗ spec và seed lệch mã.

Giới hạn đã biết của hook (không sửa được ở mức hook): thay đổi đã commit trong lượt làm việc không được `stop-verify`
kiểm lại (CI kiểm); mã chạy trong `node -e`, `python -c` không được soát; sửa `eslint.config.mjs` hay cấu hình vitest
để nới kiểm tra không bị chặn (review và CI là lớp chặn).

Còn để lại (đã cân nhắc, chưa làm): rate limit lưu trong bộ nhớ (cần Redis khi chạy nhiều bản), bảng outbox cho
thông báo, health check kiểm phiên bản schema, giới hạn lệnh cho khóa SSH của CI ngoài `restrict`, script phát hành
không sống sót khi SSH đứt giữa chừng, `/api/health` công khai, ghim digest cho image gitleaks/trivy.

## 1.0.1: sửa lỗi sau review toàn bộ (02/10/2026)

Review 1.0.0 tìm ra 1 lỗi Critical (deploy production không chạy được) và các lỗi High ở khóa tài khoản, tiền,
migration, cài đặt trên Windows, hardening SSH, GitHub Actions, hook Claude Code. Danh sách: [CHANGELOG.md](../CHANGELOG.md).
Mỗi lỗi được tái hiện bằng test ĐỎ trên 1.0.0 trước khi sửa:

| Lỗi | Test tái hiện | Trên 1.0.0 | Trên 1.0.1 |
|---|---|---|---|
| Lệnh compose chết vì thiếu `APP_TAG` (sao lưu, deploy, cảnh báo, khôi phục) | `tests/infra/run.sh` + `docker compose config` thật | 8/11 sai; compose báo `required variable APP_TAG is missing` | 11/11 |
| Khóa tài khoản bị lách bằng request song song | `http.int.spec.ts` (8 request sai song song) | đăng nhập được (200) | 423 |
| Tổng tiền tràn số | `http.int.spec.ts`, `purchase-request.spec.ts` | 500 (`9e+21`) | 400 |
| Referer sai định dạng | `http.int.spec.ts` | 500 | 403 |
| Hook bị lách / chặn nhầm / sai trên Windows | `pnpm claude:selftest` | 73/147 sai | đúng hết |
| `install.ps1` lỗi font, mất bit +x | chạy thật trên PowerShell 5.1 và Git Bash | commit lỗi font, `.sh` 100644 | đúng chữ, 100755 |

Sau đó một agent độc lập (chưa thấy quá trình sửa) rà lại toàn bộ diff và tìm thêm: khoảng 30 cách lách hook mới viết
(redirect đầu lệnh, `$(...)` trong nháy kép, `sudo -u`, option git viết tắt...), 6 lệnh bị chặn nhầm, checklist
mâu thuẫn với Rollback, request đoán đúng song song vượt khóa tài khoản, migrate thiếu `lock_timeout`. Tất cả đã sửa;
các lệnh đó được đưa vào selftest (hơn 200 tình huống), đối chiếu thấy đỏ trên bản trước. Một lượt thử thu gọn sau đó
tìm thêm lỗ ghi qua option file đích (`curl -o`, `wget -O`, `tar -C`, `unzip -d`, `-OutFile`), cũng đã sửa.

Môi trường kiểm:
- Windows 10, Node 25 (bỏ qua kiểm engine), Docker Desktop 28.3: build, lint, typecheck, unit, format, selftest,
  test tích hợp trên PostgreSQL 17 + Redis 7 thật, actionlint, shellcheck, chạy hai trình cài.
- Linux (container `node:24-bookworm`), cài sạch với `engine-strict`: install, format, build, `verify:quick`
  (38 unit), selftest (gồm post-edit), 20 test tích hợp, `tests/infra/run.sh`, migration khớp schema. Tất cả xanh.
- `docker build` thật cả 3 image (api 321 MB, worker 294 MB, web 87 MB). Image api chạy migrate, lên `healthy`,
  `/api/health` báo database và redis ok, chạy bằng user `node`.

Còn chưa kiểm: workflow chạy thật trên GitHub, E2E Playwright, hook trong một phiên Claude Code thật, script vận hành
trên máy chủ thật (đã kiểm bằng docker giả). Lỗi mức Medium từ review chưa sửa, để bước sau.

## 1.0.0

Kiểm ngày 02/10/2026 trên Ubuntu 24.04, Node 22.22, pnpm 10.34, PostgreSQL 16 và Redis 7 thật.
Nguyên tắc: không coi là xong khi chỉ đọc lại mã. Mọi phần đều được chạy bằng công cụ hoặc dữ liệu thật.

### Vòng 1: Kiểm tĩnh
| Hạng mục | Công cụ | Kết quả |
|---|---|---|
| Định dạng toàn repo | prettier --check | Sạch |
| 4 workflow GitHub Actions | actionlint 1.7.7 (kèm shellcheck cho khối `run`) | Sạch |
| YAML | yamllint | Sạch |
| 7 script vận hành + install.sh | shellcheck 0.11 | Sạch |
| 3 Dockerfile | hadolint 2.12 | Sạch |
| 2 Caddyfile | caddy validate 2.10 | Hợp lệ |
| 3 file Compose | docker compose config 2.39 | Hợp lệ; thiếu biến bắt buộc thì báo lỗi; chỉ Caddy mở cổng, PostgreSQL và Redis không lộ |
| Frontmatter 8 skill, 6 rule, 1 agent | parser YAML + đối chiếu trường hợp lệ theo tài liệu Claude Code | Hợp lệ |

### Vòng 2: Cài mới từ đầu
`install.sh` vào thư mục trống -> `pnpm install --frozen-lockfile` -> build -> `verify:quick` -> `claude:selftest`.
Kết quả: lint, typecheck sạch; 35 unit test xanh; tự kiểm hook xanh; tổng 100 giây.

### Vòng 3: Chạy thật
- 17 test tích hợp xanh trên PostgreSQL + Redis thật: luồng duyệt đủ bước, ngưỡng giám đốc, sai version, hai người duyệt đồng thời
  (chỉ một thắng), phạm vi dữ liệu (404), CSRF, rate limit 429, khóa tài khoản, cookie HttpOnly/SameSite, đăng xuất.
- Migrate, seed (chạy lại không trùng; production từ chối tài khoản demo).
- API + worker + frontend build qua proxy: tạo, gửi, từ chối thiếu lý do, ngưỡng 45 triệu sang giám đốc, gửi lại version cũ,
  giám đốc từ chối, sửa lại. Audit đủ 5 bước, worker nhận đủ job, 0 lỗi 500, dừng an toàn bằng SIGTERM.

### Vòng 4: Image production (mô phỏng từng lệnh Dockerfile)
Build context theo `.dockerignore` -> `turbo prune` -> cài frozen lockfile -> build -> `pnpm deploy --prod` cho api, worker, web.
Chạy chính artifact: lệnh migrate của Compose, lệnh seed của runbook, `CMD` của image, `HEALTHCHECK`. Gói api 69 MB, worker 45 MB,
không có dependency dev. Caddy web: SPA deep link 200, source map 404, cache đúng cho assets và index.html.

### Vòng 5: Script vận hành và tính nhất quán
Docker giả lập gọi `pg_dump`, `pg_restore`, `psql` thật. 15 tình huống đạt: sao lưu (checksum, remote, từ chối nhãn độc hại),
deploy lần đầu, tự rollback khi health hỏng / container không healthy / migration lỗi, từ chối tag độc hại, khóa chống deploy
song song, khôi phục đúng dữ liệu và từ chối file sai checksum, diễn tập khôi phục, cảnh báo không spam.
Kiểm tự động 75 lệnh pnpm và 85 đường dẫn được nhắc trong 45 file tài liệu, skill, workflow: đều tồn tại.

Hook Claude Code kiểm hành vi thật: chặn 36 lệnh Bash và 5 lệnh PowerShell nguy hiểm, cho qua lệnh an toàn; khóa file secret,
lockfile, hạ tầng, migration đã commit; post-edit bắt lỗi lint thật và tự format; stop-verify chặn khi lỗi type, tự nhả sau 3 lần.

### Lỗi thật đã phát hiện và sửa nhờ kiểm chứng
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

### Chưa kiểm được trong môi trường này (cần kiểm ở dự án đầu tiên)
| Hạng mục | Lý do | Cách kiểm |
|---|---|---|
| `docker build` và chạy container thật | Không có Docker daemon; đã mô phỏng từng lệnh | `docker build -f infra/docker/api.Dockerfile .` trên máy có Docker |
| Workflow chạy thật trên GitHub | Chỉ kiểm tĩnh bằng actionlint | Push repo, xem tab Actions |
| E2E Playwright | Không tải được trình duyệt; spec đã typecheck | Job `e2e` trên CI hoặc `pnpm test:e2e` ở máy dev |
| Hook trong phiên Claude Code thật | Không có phiên Claude Code; cấu hình theo tài liệu chính thức và bộ tự kiểm | Gõ `/hooks` và thử yêu cầu Claude chạy `git push --force` |
| Hook trên Windows | Kiểm trên Linux; đường dẫn đã xử lý dấu `\` | `pnpm claude:selftest` trên Windows |
| Tag image gitleaks v8.24.2, trivy 0.62.1 | Docker Hub bị chặn | Lần chạy CI đầu; cập nhật biến `GITLEAKS_VERSION`, `TRIVY_VERSION` nếu cần |
| Node 24, PostgreSQL 17 | Môi trường có Node 22.22, PostgreSQL 16 | CI dùng Node theo `.nvmrc` và image PostgreSQL 17 |
