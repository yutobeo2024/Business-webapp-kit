# Nhật ký thay đổi của kit

## 1.6.1 (05/10/2026)

Sửa theo lần deploy thật đầu tiên (VPS dùng chung đang chạy 6 dự án, staging rồi production, rollback, sao lưu lên
Google Drive mã hóa, diễn tập khôi phục): mọi bước của kit chạy được ngay lần đầu, các chỗ dưới đây là chỗ vướng.

- Tin thành công (deploy xong, khôi phục xong, diễn tập OK) dùng `notify` (nhãn "THÔNG BÁO"), không còn gắn nhãn
  "CẢNH BÁO" như sự cố.
- `infra/proxy-examples/caddy-add-site.sh`: thêm site vào Caddy sẵn có an toàn (sao lưu, một dòng import, validate với
  đúng EnvironmentFile, reload nóng; Caddy chạy `admin off` thì restart, kiểm site khác trước/sau, lỗi thì khôi phục).
- Runbook `server-setup.md`: repo riêng tư gói GitHub Free không có Required reviewers (gắn tag là bước duyệt); lấy cấu
  hình proxy đang chạy từ `systemctl cat` (ExecReload có thể trỏ tệp khác); đặt remote crypt và `BACKUP_REMOTE` để không
  lồng thư mục; cấu hình rclone trên máy không có trình duyệt.

## 1.6.0 (05/10/2026)

Deploy lên máy chủ DÙNG CHUNG (đã có dịch vụ khác và proxy giữ 80/443), trường hợp thường gặp với khách nhỏ. Phát hiện
khi chuẩn bị deploy thật lên một VPS đang chạy 6 dự án.

- `PROXY_MODE=shared` trong `infra/.env`: Caddy của app chỉ nghe `127.0.0.1:APP_LOCAL_PORT` (`compose.shared.yml`,
  `Caddyfile.shared`), proxy của máy lo HTTPS; header bảo mật, giới hạn body, định tuyến `/api` dùng chung một tệp
  `caddy-app.caddy` cho cả hai chế độ. `TRUST_PROXY_HOPS=2` để giới hạn đăng nhập theo IP vẫn thấy IP thật.
- `server-setup.sh --shared`: chỉ tạo user `deploy`, thư mục, cron, logrotate, cài `rclone`/`jq` nếu thiếu; không
  `apt upgrade`, không khởi động lại Docker, không đụng sshd/ufw/swap. `--dry-run` in các bước trước khi làm.
- Mẫu site cho proxy của máy: `infra/proxy-examples/` (Caddy, nginx). Runbook `server-setup.md` mục "Máy chủ dùng chung".
- Sửa: `deploy.sh` từng chạy `docker image prune -af`, xóa image không dùng của MỌI dự án trên máy (dự án khác mất bản để
  quay lại). Nay chỉ xóa image cũ của chính app theo `IMAGE_PREFIX`, giữ tag mới và tag trước.

Nâng cấp dự án tạo từ 1.5.x: `kit-sync` (infra là tệp bảo vệ: dự án chưa sửa thì lấy bản kit). Máy chủ đang chạy chế độ
riêng không cần đổi gì; `Caddyfile` nay import `caddy-app.caddy`, deploy kế tiếp tự đồng bộ cả hai tệp.

## 1.5.0 (04/10/2026)

Bước 4 của lộ trình: nâng dự án đã tạo lên bản kit mới.

- `scripts/kit-sync.mjs` (gốc repo kit, thêm vào `.env` của dự án các khóa mới còn thiếu, không sửa khóa cũ): so từng tệp template giữa bản kit lúc cài, bản kit mới và dự án. Dự án chưa
  sửa thì lấy bản kit, cả hai cùng sửa thì trộn ba chiều (`git merge-file`), còn xung đột thì để dấu cho người/agent.
  Làm trên nhánh `kit-sync/<từ>-<lên>`, không commit; không chép migration của kit (báo để sinh lại từ schema, kèm SQL
  dữ liệu cần port), không đụng `.env`, lockfile; dự án đã gỡ mẫu thì không đưa tệp mẫu trở lại và cắt khối `sample`
  trước khi trộn; tệp bị hook bảo vệ mà xung đột thì để bản kit cạnh bên cho người trộn. Báo cáo
  `docs/kit-sync/<từ>-<lên>.md` gồm ghi chú "Nâng cấp" của các bản ở giữa.
- Skill `/kit-upgrade` trong dự án: giải xung đột (lõi theo kit, nghiệp vụ của dự án giữ, thứ dự án tự làm trùng lõi thì
  chuyển sang lõi), sinh migration, kiểm tra, báo việc cho người.
- Installer ghi `.kit.json` (phiên bản, commit kit). Mỗi bản kit có tag `kit-vX.Y.Z`.
- Tạo dự án bằng "Use this template" trên GitHub: repo `Business-webapp-template` (app ở gốc, bật Template repository)
  nhận nội dung `template/` của mỗi bản phát hành qua `scripts/publish-template.mjs` (một commit mỗi bản, giữ bit +x,
  thêm `.kit.json`). Sau khi clone: `pnpm project:setup` (kiểm Node, tạo `.env` với DB/Redis riêng). Hai installer dùng
  chung script này thay cho phần sinh `.env` tự viết.
- kit-ci: test công cụ, và nâng thật một dự án cài từ bản kit trước lên bản mới nhất (build + verify).

Nâng cấp dự án tạo từ 1.4.x trở về trước: chạy `node <kit>/scripts/kit-sync.mjs <dự án> --from <bản đã cài>`, rồi
`/kit-upgrade` trong dự án (skill này đến cùng lần đồng bộ).

## 1.4.1 (04/10/2026)

Sửa theo dogfood đợt 2 (lát 7-8 của module tạm ứng, chạy với lớp agent 1.4.0: mỗi lát $10-11, rẻ hơn 25-75% đợt 1).

- Mỗi dự án có DB và Redis riêng trên dịch vụ dev dùng chung (finding #29, #31): installer đặt `DATABASE_URL`,
  `REDIS_URL`, `TEST_DATABASE_URL`, `TEST_REDIS_URL` trong `.env` theo tên thư mục dự án (bỏ dấu tiếng Việt). Trước đây
  mọi dự án dùng chung `app_test` và Redis số 0: migration của dự án này làm hỏng DB test của dự án kia, worker dự án này
  có thể nhận job của dự án kia.
- `pnpm test:integration` cục bộ tự lấy DB/Redis test từ `.env`, không cần gõ biến môi trường. CI đặt biến như cũ.
- `pnpm db:reset-local [dev]` đọc tên DB từ `.env`, chỉ chạy với DB localhost, và là bước tạo DB khi cài lần đầu (thay
  `db:migrate` + `db:seed` trong hướng dẫn).
- Rule E2E: chạy lại nhiều lần trên cùng DB phải vẫn xanh (dữ liệu theo dấu thời gian, không dựa vào trạng thái DB dev).

Nâng cấp dự án tạo từ 1.4.0: thêm `TEST_DATABASE_URL`, `TEST_REDIS_URL` vào `.env` (xem `.env.example`), chép
`apps/api/test/test-env.ts`, hai `vitest.integration.config.ts`, `scripts/db-reset-local.mjs`. Đổi tên DB dev/test riêng
thì chạy `pnpm db:reset-local dev` và `pnpm db:reset-local` (DB dev cũ không bị xóa, tự chép dữ liệu nếu cần).

## 1.4.0 (04/10/2026)

Bước 3 (dogfood): sửa những chỗ kit gây vướng khi Claude Code xây module tạm ứng/quyết toán thật trên dự án tạo từ 1.3.0,
và khi CI của dự án đó chạy trên GitHub lần đầu. CI xanh ngay lần đầu, lõi tự đứng, gỡ module mẫu bằng một lệnh.

Thêm

- `pnpm sample:remove`: gỡ module mẫu (xóa tệp theo `scripts/sample-manifest.json`, cắt khối đánh dấu `sample` trong mã
  và tài liệu, sinh migration `contract` xóa bảng mẫu, kiểm không còn tham chiếu, chạy `verify:quick`). Tự dừng khi dự
  án đã phát hành (có tag `vX.Y.Z` hoặc ghi chép trong `docs/runbooks/releases/`) hoặc không phải repo git. `/feature` đề xuất làm ở lát 0 của module thật đầu tiên.
- Lõi tự test qua tính năng lõi: thông báo `account.password_reset` (quản trị đặt lại mật khẩu thì báo người đó, qua job
  `JOBS.notify` đẩy sau commit) và `import.finished` (báo kết quả nhập Excel); loại xuất `admin.users.xlsx` (danh sách
  người dùng theo bộ lọc của màn quản trị, không có số điện thoại); trang chủ có thông báo chưa đọc. Test tích hợp/E2E của lõi không còn dùng
  module mẫu và chạy được sau khi gỡ; test của mẫu nằm riêng (`apps/api/test/sample`, `apps/worker/src/sample`).
- Mã chứng từ theo năm `nextDocumentCode(tx, "PR")` (`PR-2026-000001`, bảng `document_counters`, khóa dòng, về 1 mỗi năm).
- Chính sách giữ tệp sau xóa mềm theo loại (`FILE_RETENTION`, mặc định 7 ngày, `"forever"` cho chứng từ kế toán).
- Seed `--sync-default-roles`: thêm quyền MỚI của `DEFAULT_ROLES` (so với lần seed/đồng bộ trước) vào vai trò mặc định
  trên DB đã seed, có audit. Quyền quản trị viên đã gỡ không bị cấp lại; vai trò nhận diện bằng `roles.default_key`, không
  theo tên (migration `0004`).
- `pnpm db:reset-local [test|dev]`: dựng lại DB cục bộ khi migration chưa commit đã áp rồi phải sinh lại, hoặc DB test bị
  bẩn (gặp khi hai dự án dùng chung dịch vụ dev).
- E2E đăng nhập một lần mỗi tài khoản (`e2e/auth.setup.ts`, `pageAs` trong `e2e/users.ts`): cả bộ không chạm giới hạn
  10 lần đăng nhập/phút.
- Mẫu PDF tối thiểu `pdf-check` cho test và smoke image worker (không phụ thuộc module nghiệp vụ).
- CI cho repo kit (`.github/workflows/kit-ci.yml`): bộ kiểm của template trên hai biến thể (còn mẫu, đã gỡ mẫu), cài dự
  án bằng `install.sh`, build 3 image + kiểm không chạy root + trivy image + in PDF thử, gitleaks, actionlint, pnpm audit.

Sửa (CI thật trên GitHub)

- gitleaks báo nhầm giá trị giữ chỗ: `.gitleaks.toml` chỉ bỏ qua đúng các giá trị đó, giữ luật mặc định.
- Image web chạy root (trivy AVD-DS-0002): chạy user `web`, Caddy nghe 8080, tắt admin API; `infra/Caddyfile` trỏ
  `web:8080`. Image api/worker gỡ npm/corepack/yarn đi kèm image node (lỗ hổng HIGH dù app không dùng); cả 3 image nâng
  gói hệ thống lúc build. Caddy 2.10 lên 2.11.6 (image web và proxy HTTPS trong `compose.prod.yml`): binary 2.10 có 59
  lỗ hổng HIGH/CRITICAL. Kiểm bằng trivy image: 3 image và image proxy không còn HIGH/CRITICAL đã có bản vá.
- Action GitHub nâng lên bản chạy Node 24, pin SHA. Dependabot bỏ qua nâng bản lớn của image postgres/redis/node/caddy.
- `install.sh`/`install.ps1`: nhánh đầu là `main` (CI chạy khi push `main`); dừng khi Node không phải 22/24 (trừ
  `--force`). Bit +x của `infra/backup-files.sh` trong repo kit.
- `formatDateTime` dựng `dd/MM/yyyy HH:mm` tường minh, giống nhau trên web, Excel, PDF.
- Hook `guard-bash` chặn lệnh shell ghi ra ngoài thư mục dự án (trừ thư mục tạm); hiểu đúng đường dẫn Git Bash `/d/...`
  trên Windows.
- Dọn tệp đã xóa mềm lọc theo `FILE_RETENTION` ngay trong SQL: nhiều tệp giữ mãi không chặn việc dọn loại khác.
- `check-migrations` bắt thêm `DROP SEQUENCE/VIEW/FUNCTION` chưa đánh dấu contract.
- `infra/restore-drill.sh` chỉ kiểm bảng lõi.

Lớp agent

- `/business-flow`: tối đa 7 câu, mỗi câu một ý, điểm có mặc định gom thành danh sách giả định; quy trình nhiều loại
  chứng từ thì đề xuất tách spec (dưới ~250 dòng).
- `/feature`: lát 0 gỡ mẫu; E2E tối thiểu chạy ngay trong lát có giao diện; khi lặp chạy test theo tệp, toàn bộ một lần
  cuối lát; đổi `DEFAULT_ROLES` thì `--sync-default-roles`; không ghi ra ngoài dự án.
- `/db-migration`: cách sinh lại migration chưa commit đã áp vào DB cục bộ. CLAUDE.md, rule testing/backend/frontend
  trỏ vào lõi thay vì module mẫu.

Lệch kế hoạch

- Image chạy `apk upgrade`/`apt-get upgrade` lúc build: cùng commit build lúc khác có thể ra image khác (lấy bản vá mới
  hơn). Chấp nhận để image không mang lỗ hổng đã có bản vá; cần tái lập chính xác thì dùng image đã đẩy theo tag.

- Không làm biến `AUTH_LOGIN_LIMIT_PER_MIN`: giới hạn đăng nhập gắn bằng decorator lúc nạp module, không đọc được env đã
  validate; giữ cố định 10 lần/phút (chốt bảo mật) và giải quyết E2E bằng phiên lưu sẵn.

Nâng cấp dự án tạo từ 1.3.x

- Migration `0003` tạo `document_counters` (điền từ mã phiếu đã có; dự án đã gỡ mẫu thì bỏ qua). Sequence `pr_code_seq`
  được GIỮ để rollback image về 1.3.x vẫn lập phiếu được; xóa bằng migration contract ở bản sau.
- `check-migrations` bắt thêm `DROP SEQUENCE/VIEW/FUNCTION`: migration cũ của dự án có các lệnh này (ví dụ thay
  sequence mã phiếu bằng bộ đếm) sẽ làm CI đỏ. Chưa phát hành thì thêm dòng đầu `-- contract: <lý do>`.
- Migration `0004` thêm `roles.default_key`, `roles.synced_default_permissions`. Lần seed đầu sau khi nâng nhận vai trò
  mặc định cũ theo tên với mốc là danh sách quyền mặc định hiện tại (không cấp thêm quyền nào lúc nhận). Quyền đã thêm
  vào `DEFAULT_ROLES` trước khi nâng mà DB chưa có thì quản trị viên cấp trên giao diện.
- Danh sách phiếu mẫu chuyển sang `/purchase-requests`; liên kết trong thông báo cũ trỏ `/?q=` vẫn mở trang chủ.
- Người dùng thấy: route `/` thành trang chủ của lõi (lời chào, thông báo chưa đọc, lối tắt) thay cho trang dự án đặt ở
  `/`; E2E lõi dựa vào trang này. Muốn giữ trang cũ thì đổi `homeRoute` và sửa `e2e/admin.spec.ts` theo.
- Web nghe 8080: cập nhật `infra/Caddyfile` (`reverse_proxy web:8080`) cùng lúc với image web mới.
- E2E: chép `e2e/auth.setup.ts`, `e2e/users.ts`, cấu hình `projects` trong `playwright.config.ts`, thêm `e2e/.auth/` vào
  `.gitignore`, đổi test sang `pageAs`.

## 1.3.0 (03/10/2026)

Bước 2c: thông báo (trong app, email, Zalo ZNS) và nhập Excel, lõi dùng chung cho mọi dự án. Spec:
`template/docs/specs/003-thong-bao-va-nhap-excel.md`, ADR-0006. Hoàn tất bước 2 của lộ trình.

Thêm

- Thông báo trong app: chuông có số chưa đọc, trang Thông báo, đánh dấu đã đọc; mỗi người chỉ thấy của mình.
- Kênh email qua SMTP chung (nodemailer) và Zalo ZNS (tắt mặc định); mỗi người tự bật/tắt kênh; số điện thoại người dùng.
- Người nhận tính theo quyền hiện tại và phải xem được bản ghi; mỗi sự kiện báo mỗi người một lần; mỗi kênh gửi tối đa
  một lần cùng lúc, lỗi tạm thời thử lại, lỗi vĩnh viễn dừng ngay, lượt quét 10 phút gửi lại lần giao bị kẹt.
- Token Zalo lưu mã hóa AES-256-GCM (`APP_ENCRYPTION_KEY`), làm mới trong transaction khóa dòng và hằng ngày; lệnh
  `zalo-token` nạp token từ stdin.
- Phiếu đề nghị báo trưởng phòng/giám đốc khi chờ duyệt, báo người lập khi được duyệt hoặc bị từ chối.
- Nhập Excel hai bước: tải lên, kiểm từng dòng (dùng lại schema form, trùng trong tệp, trùng với DB), xem lỗi theo
  dòng/cột hoặc xem trước, xác nhận thì kiểm lại và ghi tất cả trong một transaction; chặn zip bomb trước khi mở tệp;
  tệp mẫu có hướng dẫn. Mẫu: nhập phòng ban.
- Vận hành: Mailpit cho dev và CI, `alert-check` cảnh báo nhiều thông báo gửi lỗi và token Zalo không làm mới được,
  runbook notifications, dọn thông báo đã đọc quá 90 ngày và tệp nhập quá 7 ngày.
- Lớp agent: CLAUDE.md, rule backend/security/frontend, skill `/feature` và `/security-audit` theo lõi mới.

Thay đổi phá tương thích (dự án tạo từ 1.2.x)

- `writeAudit`, `isUniqueViolation` chuyển sang `@app/server` (đường dẫn cũ trong api vẫn re-export).
- Worker cần thêm env `APP_ORIGIN` (liên kết trong email); bật email/Zalo theo `infra/.env.example`.
- Migration `0002` thêm bảng thông báo, nhập, token và cột `users.phone`.

## 1.2.0 (03/10/2026)

Bước 2b: tệp đính kèm và xuất Excel/PDF, lõi dùng chung cho mọi dự án. Spec: `template/docs/specs/002-tep-va-xuat-file.md`,
ADR-0005.

Thêm

- Gói `packages/server`: logic phía server dùng chung api và worker (truy vấn đọc, phạm vi xem, list-query, lưu tệp), để
  dữ liệu xuất đi qua đúng truy vấn và phạm vi xem của màn hình.
- Lưu tệp qua interface `FileStorage` (driver đĩa máy chủ; thêm S3 không phải sửa module), bảng `files`. Kiểm loại theo
  nội dung tệp, giới hạn `FILE_MAX_MB`, khóa lưu do hệ thống sinh, tệp vật lý bị xóa khi transaction lỗi; tải về luôn
  `attachment` với `nosniff` và CSP `sandbox`, tên tiếng Việt chuẩn RFC 5987.
- Xuất file chạy nền: danh mục loại xuất kèm quyền, bảng `export_jobs`, API `/exports` (chỉ người yêu cầu thấy/tải, hết
  hạn 410, tối đa 3 lần chưa xong mỗi người, audit yêu cầu và tải về), worker hàng đợi `exports` nạp lại quyền hiện tại
  của người yêu cầu; Excel bằng `exceljs` (giờ Việt Nam, tiền là số, giới hạn `EXPORT_MAX_ROWS`); PDF bằng Chromium
  (tắt JavaScript, chặn mạng, mẫu HTML qua `html` tự escape); dọn tệp hết hạn và đính kèm đã xóa quá 7 ngày lúc 04:00.
- Mẫu trên phiếu đề nghị: đính kèm (BR-09), Excel danh sách theo bộ lọc đang xem (quyền mới `pr.export`), in PDF từng
  phiếu; web có hộp thoại đính kèm, nút xuất và trang "Tệp đã xuất".
- Hạ tầng: thư mục tệp trên host mount vào api và worker, `infra/backup-files.sh` (rclone sync, giữ bản bị xóa theo
  ngày) chạy 02:30, cảnh báo khi quá 26 giờ chưa sao lưu tệp; image worker có Chromium và font Noto, CI kiểm image in
  được PDF trước khi đẩy.
- Lớp agent: CLAUDE.md, rule backend/security/frontend, skill `/feature` và `/security-audit` theo lõi mới.

Sửa

- Test tích hợp đỏ chập chờn: `resetDb` không reset sequence mã phiếu.

Thay đổi phá tương thích (dự án tạo từ 1.1.x)

- `loadAccess`, `list-query`, `policy.ts` của phiếu chuyển sang `@app/server`; `formatVnd`, `formatDateTime` chuyển từ
  `apps/web/src/lib/format.ts` sang `@app/shared`. Sửa import theo.
- Image worker chuyển từ Alpine sang Debian slim (lớn hơn đáng kể vì Chromium); giới hạn RAM worker trong compose lên 1G.
- Máy chủ đang chạy cần tạo thư mục tệp (`server-setup.sh` mới, hoặc tạo tay theo runbook) trước khi deploy bản này.
- Vai trò mặc định có thêm `pr.export`; `ensureDefaultRoles` không sửa vai trò đã có, dự án đang chạy tự cấp trên giao diện.

## 1.1.0 (03/10/2026)

Bước 2a: lõi quản trị dùng chung cho mọi dự án. Spec: `template/docs/specs/000-quan-tri-nguoi-dung.md`, ADR-0004.

Thêm

- Phân quyền động: quyền khai báo trong mã (mỗi module tự khai báo), vai trò là tập quyền do quản trị viên cấu hình trên
  giao diện; một người nhiều vai trò; đổi vai trò có hiệu lực ngay. `can()`, `@RequirePermission`, `PermissionGuard`.
- Quản trị người dùng, vai trò, phòng ban (API + giao diện) với chốt chặn: quyền quản trị chỉ người đang có mới cấp được và
  không thao tác được trên tài khoản mạnh hơn mình; luôn còn người có cả quyền quản lý người dùng và vai trò; vai trò hệ thống
  chỉ chứa quyền quản trị; không tự khóa, tự đổi vai trò/phòng ban, không sửa quyền của vai trò mình đang giữ;
  khóa/đặt lại mật khẩu thu hồi phiên; audit không chứa mã băm.
- Lệnh khôi phục quản trị từ máy chủ `grant-admin <email>` (runbook incident) khi không còn ai quản trị được.
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
