# Báo cáo kiểm chứng kit

## 1.7.0: build một lần, staging và production trên cùng máy (05/10/2026)

Cùng VPS dùng chung của 1.6.x; dự án tam-ung nâng 1.6.0 -> 1.7.0 bằng kit-sync (PR #6, 2 xung đột trộn tay).

| Hạng mục | Kết quả |
|---|---|
| `server-setup.sh --shared --instance staging` | Tạo `/opt/app-staging`, dữ liệu, sao lưu, log, cron lệch giờ; không đụng `/opt/app` |
| Site Caddy `staging.webappkit.ydsg.website` -> 127.0.0.1:8096 | `caddy-add-site.sh`: site khác giữ nguyên mã trả lời trước/sau |
| Merge main -> CI build `sha-cd2e8bb` -> deploy staging | Xanh; dự án compose `app-staging` (DB, Redis riêng), health OK qua HTTPS |
| Production trong lúc đó | Vẫn `v0.1.0`, container không khởi động lại |
| Lịch sử deploy | Ghi digest api/worker/web |
| Hai instance | ~0,6 GB RAM tổng cho app; máy còn ~2,7 GB trống |
| Test kit | tests/infra 43/43 (dự án 45/45), shellcheck, actionlint, selftest 261/261 |

Chưa kiểm (chờ người dùng gắn tag `v0.2.0` vào `cd2e8bb`): job `promote` (không build, digest production = staging),
tag vào commit chưa qua staging bị chặn.

## 1.6.x: deploy thật lên máy chủ dùng chung (05/10/2026)

VPS Ubuntu 24.04 đang chạy 6 dự án Docker Compose sau Caddy của máy; app dogfood tam-ung (kit 1.6.0) tại
`webappkit.ydsg.website`.

| Hạng mục | Kết quả |
|---|---|
| `server-setup.sh --shared` | Chỉ tạo user deploy, thư mục, cron, cài rclone; không đụng Docker, ufw, sshd, dự án khác |
| Thêm site vào Caddy máy (`admin off`) | Validate rồi restart; site khác trả lời giống hệt trước/sau |
| Deploy staging qua CI (merge main) | Xanh lần đầu: sao lưu trước deploy, migrate, health qua HTTPS |
| Deploy production qua tag `v0.1.0` | Xanh (gói Free: không người duyệt, gắn tag là bước duyệt) |
| Rollback 2 chiều (`rollback.yml`) | v0.1.0 -> sha-27654e3 -> v0.1.0, mỗi lần ~1-2 phút, app khỏe |
| Bảo mật đường đi | Chỉ mở 127.0.0.1:8095; HSTS/CSP/X-Frame; CSRF chặn Origin lạ; API ghi đúng IP thật qua 2 lớp proxy |
| Sao lưu | DB (kèm sha256) và tệp lên Google Drive qua rclone crypt (tên tệp mã hóa); diễn tập khôi phục 8 giây |
| Tài nguyên | App ~360 MB RAM; dọn image chỉ của app (giữ bản đang chạy + bản trước) |

Chưa kiểm: gửi email (SMTP để trống), Zalo, cảnh báo qua webhook (chưa đặt ALERT_WEBHOOK_URL), cron chạy theo lịch.

## 1.5.0: nâng dự án đã tạo lên bản kit mới (04/10/2026)

| Hạng mục | Kiểm bằng | Kết quả |
|---|---|---|
| `kit-sync`: lấy bản kit, thêm, xóa, trộn ba chiều, xung đột, dự án đã gỡ mẫu, bỏ qua lockfile/migration, thêm khóa `.env` thiếu, cây bẩn bị từ chối | `scripts/kit-sync.test.mjs` (repo kit và dự án giả) | 3/3 xanh |
| Dự án cài từ 1.4.0, có sửa riêng, nâng lên 1.4.1 | chạy thật ở máy (kịch bản của job `kit-sync` trong kit-ci) | không xung đột, sửa của dự án còn, build + verify xanh |
| Dự án dogfood `tam-ung` (tạo từ 1.3.0, đã gỡ mẫu, module tạm ứng thật) nâng lên 1.5.0 | `kit-sync` (23 lấy bản kit, 10 thêm, 6 trộn sạch, 55 xung đột, 1 tệp bảo vệ trộn tay) rồi Claude Code thật chạy `/kit-upgrade` ($11.40) | tích hợp 196 api + 76 worker, E2E 13/13 x2 trên DB test riêng của dự án |
| CI thật của dự án sau nâng cấp | `yutobeo2024/tam-ung-dogfood` PR #1 | quality, tích hợp, E2E, quét bảo mật (image web không chạy root) xanh |

Lần nâng đầu bắt thêm 3 chỗ, đã sửa trong kit: `.env` thiếu khóa mới (kit-sync tự thêm), tệp trộn chưa format, luật
migration mới bắt migration cũ của dự án (skill chạy check-migrations, CHANGELOG ghi chú).

## 1.4.0: sửa theo dogfood, CI thật trên GitHub (04/10/2026)

Lần đầu kit được kiểm bằng CI thật trên GitHub, không chỉ trên máy.

| Hạng mục | Kiểm bằng | Kết quả |
|---|---|---|
| CI của repo kit, biến thể còn mẫu và sau `pnpm sample:remove`: chất lượng, tích hợp, E2E | `kit-ci.yml`, run 37192021427 (nhánh `kit-1.4.0`) | 6/6 xanh |
| Cài dự án bằng `install.sh` (nhánh `main`, bit +x, verify), chặn Node lệch | `kit-ci.yml` job install | xanh |
| 3 image: build, không chạy root, trivy image không còn HIGH/CRITICAL đã có bản vá, worker in PDF tiếng Việt | `kit-ci.yml` job images | 3/3 xanh |
| gitleaks lịch sử kit, actionlint, `pnpm audit`, trivy fs | `kit-ci.yml` job security | xanh |
| Dự án mới từ 1.4.0 trên repo riêng tư: PR chạy `ci.yml` của dự án | `yutobeo2024/kit140-check` PR #1, run 37192025673 | quality, tích hợp, E2E, bảo mật xanh |
| Cục bộ, còn mẫu | tích hợp 89 api + 42 worker, E2E 11/11 (đăng nhập một lần mỗi tài khoản), selftest 261, tests/infra 25 | xanh |
| Cục bộ, bản sao đã gỡ mẫu | tích hợp 67 api (1 bỏ qua có chủ đích) + 28 worker, E2E 4/4, check-migrations, chạy lại không làm gì | xanh |
| Agent độc lập rà diff | 1 chặn (đồng bộ vai trò cấp lại quyền đã gỡ), 5 nên sửa: đã sửa, có test | xong |

CI thật bắt thêm một lỗi không thấy được ở máy: job quét bảo mật đỏ ở bước dọn dẹp của `setup-node` (cache pnpm khi
không cài gì). Đã sửa ở cả kit lẫn template. Chưa kiểm: deploy staging/production (chưa có máy chủ).

## 1.3.0: thông báo (trong app, email, Zalo) và nhập Excel (03/10/2026)

Spec `template/docs/specs/003-thong-bao-va-nhap-excel.md`, ADR-0006. Test viết cùng từng bước.

| Hạng mục | Kiểm bằng | Kết quả |
|---|---|---|
| Người nhận theo quyền hiện tại (cùng phòng ban, người duyệt cuối, người lập), không báo người khóa/mất quyền/không xem được, job chạy lại và job đến muộn | `apps/worker/src/notifications.int.spec.ts` (7) | xanh |
| Giao email qua SMTP thật (Mailpit), không gửi hai lần, tắt kênh/thiếu SĐT bỏ qua có lý do, lỗi tạm thời/vĩnh viễn, quét lại lần giao kẹt | `notifications/deliver.int.spec.ts` (5) | xanh |
| Zalo ZNS với máy chủ Zalo giả: làm mới token đúng một lần khi 6 job song song, token lưu mã hóa, token bị từ chối thì làm mới bắt buộc, phân loại lỗi | `notifications/zalo.int.spec.ts` (6) | xanh |
| Mã hóa bí mật, SĐT, email escape và chặn liên kết ra ngoài, cấu hình Zalo | unit | xanh |
| API thông báo, cài đặt kênh, SĐT người dùng | `test/notifications.int.spec.ts` (4) | xanh |
| Nhập Excel: lỗi đúng dòng/cột, tất cả hoặc không, dữ liệu đổi giữa xem trước và xác nhận, mất quyền, quét yêu cầu kẹt/bỏ dở | `apps/worker/src/imports/imports.int.spec.ts` (6) | xanh |
| Đọc xlsx (tiêu đề, công thức, chữ định dạng, dòng trống, quá số dòng), zip bomb thật nở 60 MB kể cả khai báo kích thước sai | unit `packages/server` | xanh |
| API nhập: tệp mẫu, quyền, 415, xác nhận song song chỉ nhận một, người khác 404, hủy | `test/imports.int.spec.ts` (4) | xanh |
| Luồng thật trên trình duyệt | E2E: chuông thông báo đi tới phiếu, nhập phòng ban (tệp lỗi bị chặn, tệp đúng nhập xong), cùng 5 E2E cũ | 7/7 |
| Cảnh báo vận hành | `tests/infra/run.sh` | 25/25 Windows, 24/24 Linux |
| Cài sạch Linux `node:24-bookworm` (có Mailpit) | format, build, 96 unit, 114 tích hợp (82 api + 32 worker), selftest 239, hạ tầng, migration, drift | xanh |
| Image production | build 3 image, worker in PDF thật, có `nodemailer`, `exceljs`, lệnh `zalo-token` | xanh |

E2E chạy với worker thật gửi email tới Mailpit: thư "Phiếu ... chờ bạn duyệt" tới đúng hộp thư trưởng phòng.

Agent độc lập rà bước này: không có lỗi mức cao (gửi nhầm người, lộ token, IDOR, chèn HTML/header email, liên kết ra
ngoài, xác nhận nhập song song đều đứng vững). Đã sửa: (1) zip bomb khai báo kích thước nhỏ hơn thật lọt qua bộ chặn và
làm worker phình ~800 MB (đã tái hiện), nay giải nén thật có trần byte; (2) yêu cầu nhập kẹt không có lượt quét; (3) tệp
nhập bỏ dở ở trạng thái chờ xác nhận không bao giờ bị dọn; (4) hủy nhập không kiểm lại quyền; (5) SMTP mẫu trong
`infra/.env.example` làm gửi lỗi hàng loạt nếu quên sửa.

Giới hạn còn lại (ghi trong ADR-0006): kênh Zalo mới chỉ kiểm với máy chủ giả; bật cho khách phải đối chiếu tài liệu Zalo
hiện hành và gửi thử với OA thật. Một lần chạy E2E đầu tiên có AC-01 đỏ khi máy vừa build xong, không tái hiện trong 4
lần chạy sau.

## 1.2.0: tệp đính kèm và xuất Excel/PDF (03/10/2026)

Spec `template/docs/specs/002-tep-va-xuat-file.md`, ADR-0005. Bước tách `packages/server` chỉ đổi chỗ: toàn bộ test cũ
xanh lại trước khi thêm tính năng.

| Hạng mục | Kiểm bằng | Kết quả |
|---|---|---|
| Lưu trữ (khóa lạ, thoát thư mục, không ghi đè), loại tệp theo nội dung, tên tệp (bidi, C1), Content-Disposition | unit `packages/server` (17) | xanh |
| Đính kèm: đúng loại, sai nội dung 415, quá dung lượng 413, quá 10 tệp, ngoài phạm vi 404, không phải người lập 403, phiếu đã gửi, xóa mềm, tệp mất 410, audit | `test/attachments.int.spec.ts` (9) | xanh |
| Xuất qua API: thiếu quyền 403, tham số sai 400, in phiếu ngoài phạm vi 404, giới hạn 3 lần, chỉ người yêu cầu tải, hết hạn 410, chưa xong 409, audit | `test/exports.int.spec.ts` (5) | xanh |
| Worker (DB + Chromium thật): Excel chỉ chứa phiếu trong phạm vi xem, mất quyền/bị khóa giữa chừng, vượt giới hạn dòng, chạy lại, yêu cầu đã lỗi không chạy, PDF thật, dọn dẹp, yêu cầu kẹt | `apps/worker/src/exports/exports.int.spec.ts` (8) | xanh |
| Mẫu in escape dữ liệu người dùng | unit worker (7) | xanh |
| Luồng thật trên trình duyệt | E2E: đính kèm và tải lại, tệp giả đuôi bị từ chối, xuất Excel chạy nền rồi tải ở "Tệp đã xuất", cùng 3 E2E cũ | 5/5 |
| Image worker in được PDF (Chromium Debian, font Noto Sans nhúng, chạy user `node`, không mạng) | `tests/infra/worker-pdf-smoke.sh` trên image đã build | ĐÚNG |
| Sao lưu tệp, cảnh báo | `tests/infra/run.sh` | 22/22 Windows, 21/21 Linux |
| Cài sạch Linux `node:24-bookworm` | format, build, 79 unit, 82 tích hợp (74 api + 8 worker), selftest 239, hạ tầng, migration, drift | xanh |
| Image production | build 3 image (worker 1,48 GB do Chromium, ghi trong ADR-0005) | xanh |

Bản PDF mẫu được mở ra xem: bố cục A4, dấu tiếng Việt đúng, chuỗi `<khẩn>` trong tiêu đề hiện nguyên văn (đã escape).

Agent độc lập rà bước này bằng tấn công thật: không có lỗi mức cao (IDOR, xuất vượt phạm vi, lách kiểm loại tệp, thoát
thư mục, chèn header, chèn HTML vào PDF, Chromium gọi mạng hay đọc `file://` đều bị chặn). Đã sửa:
(1) client hủy tải làm luồng đọc giữ file descriptor và bộ đệm mãi, lặp lại được để làm cạn tài nguyên api (đã tái hiện
với tệp 80 MB); (2) yêu cầu xuất kẹt chỉ được dọn lúc 04:00, chiếm suất giới hạn hơn một ngày; (3) worker có thể chạy và
đổi thành "Xong" một yêu cầu API đã đánh dấu lỗi; (4) runbook khôi phục tệp xóa nhầm không làm được sau 7 ngày; (5) tên
tệp còn ký tự đổi hướng chữ; (6) tệp vật lý mất trả 500; (7) tài liệu thiếu bước cài Chromium khi dev.

Chạy lặp trên Linux lộ thêm một lỗi chập chờn có từ 1.1.0: `resetDb` không reset sequence mã phiếu, mã tăng qua các test
tới lúc chứa chuỗi đang tìm ("50") thì test tìm kiếm đỏ. Đã sửa, chạy lại 4 lần liền xanh. Một lần chạy khác có hook
`beforeEach` chờ khóa quá 60 giây cùng lúc máy Docker quá tải (migration mất kết nối, test đồng bộ 5 giây); không tái
hiện được trong 7 lần chạy sau, ghi lại để theo dõi trên CI.

## 1.1.0: lõi quản trị và phân quyền động (03/10/2026)

Spec `template/docs/specs/000-quan-tri-nguoi-dung.md`, ADR-0004. Test viết trước mỗi bước.

| Hạng mục | Kiểm bằng | Kết quả |
|---|---|---|
| Phân quyền theo quyền, đổi vai trò có hiệu lực ngay, quyền lạ bị bỏ qua, mật khẩu tạm, đổi mật khẩu | `test/access.int.spec.ts` (9 ca) | xanh |
| Quản trị người dùng/vai trò/phòng ban và mọi chốt chặn (leo thang, chiếm tài khoản, người quản trị cuối, tự thao tác, audit) | `test/admin.int.spec.ts` (23 ca) | xanh |
| Mẫu danh sách (tìm có ký tự %, _, sắp xếp ổn định, cột lạ 400) | unit + tích hợp | xanh |
| Luồng thật trên trình duyệt | E2E: quản trị tạo vai trò và người dùng, người mới bị bắt đổi mật khẩu rồi lập phiếu; AC-01; tìm kiếm trên URL | 3/3 |
| Cài sạch Linux `node:24-bookworm` | format, build, 67 unit, 60 tích hợp, selftest, hạ tầng, migration | xanh |
| Image production | build 3 image | xanh |

Agent độc lập rà bước này (chạy khai thác thật bằng test tạm): không có leo thang lên quyền quản trị, IDOR hay SQL
injection; hai bất biến luôn còn người quản trị đứng vững khi chạy song song. Tìm ra 2 lỗi mức Trung bình, đã sửa sau khi
sửa spec 000 trước: (1) bất biến chỉ đếm `roles.manage` nên có thể mất hết người quản lý tài khoản mà không cấp lại được
(nay đếm người có cả hai quyền, thêm lệnh khôi phục `grant-admin`); (2) sửa quyền của vai trò mình đang giữ để tự cấp quyền
nghiệp vụ, lách tách biệt nhiệm vụ (nay chặn; vai trò hệ thống chỉ chứa quyền quản trị). Cùng sửa: không tự đổi phòng ban,
người lập bị thu `pr.create` không gửi/sửa/hủy phiếu cũ, xóa vai trò xếp hàng với thao tác gán.
Rủi ro còn lại (ghi trong ADR-0004): người có `users.manage` gán được vai trò nghiệp vụ và đặt lại mật khẩu tài khoản
nghiệp vụ, kiểm soát bằng audit và quy trình của khách.

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
