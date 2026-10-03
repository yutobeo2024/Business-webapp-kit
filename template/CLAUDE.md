# CLAUDE.md

## Dự án

<TÊN DỰ ÁN>: web app quản lý quy trình nghiệp vụ cho <KHÁCH HÀNG>. Sản phẩm PRODUCTION chạy trên dữ liệu thật
của doanh nghiệp: ưu tiên đúng và an toàn hơn nhanh.
Spec nghiệp vụ: `docs/specs/`. Quyết định kiến trúc: `docs/adr/`. Vận hành: `docs/runbooks/`.

## Stack

Monorepo pnpm + Turborepo, TypeScript strict, ESM, Node 24 LTS.

- `apps/api`: NestJS 12, xác thực session cookie, guard mặc định bắt đăng nhập.
- `apps/worker`: BullMQ (thông báo, job định kỳ). `apps/web`: React 19 + Vite, TanStack Router/Query, Tailwind, React Hook Form.
- `packages/db`: Drizzle ORM + PostgreSQL 17 (schema, migration). `packages/shared`: Zod schema + type dùng chung FE/BE.

## Lệnh

- `pnpm dev:services` (Postgres + Redis bằng Docker), `pnpm dev`, `pnpm build`
- `pnpm verify:quick` = lint + typecheck + unit test. PHẢI xanh trước khi báo xong (hook Stop tự chạy).
- `pnpm test:integration` (cần `DATABASE_URL=.../app_test`, `REDIS_URL=redis://localhost:6379/15`)
- DB: sửa `packages/db/src/schema.ts` rồi `pnpm db:generate --name <ten_thay_doi>`; áp dụng: `pnpm db:migrate`.

## Lõi có sẵn: dùng lại, không viết lại

- Phân quyền (ADR-0004): QUYỀN khai báo trong mã (`packages/shared/src/permissions.ts`), VAI TRÒ là tập quyền do quản trị
  viên cấu hình trên giao diện. Mã chỉ kiểm quyền bằng `can(user, "...")` / `@RequirePermission(...)`, KHÔNG BAO GIỜ kiểm
  tên vai trò. Module mới khai báo quyền của mình như `PR_PERMISSIONS` rồi đăng ký vào `PERMISSIONS`.
- Quản trị người dùng, vai trò, phòng ban, đổi mật khẩu: `apps/api/src/modules/admin/`, `apps/web/src/features/admin/`
  (spec 000). Không sửa chốt chặn trong `safeguards.ts` khi chưa có spec duyệt.
- Danh sách: `listQuerySchema` (shared) + `searchCondition`/`orderBy`/`paginated` (`apps/api/src/common/list-query.ts`) +
  `DataTable`/`SortTh`/`Pagination`/`SearchInput` và bộ lọc trên URL (`searchValidator`, `nextSearch`) ở web.

## Mẫu nghiệp vụ: copy theo module `apps/api/src/modules/purchase-requests/`

- `state-machine.ts`: bảng chuyển trạng thái tường minh + hàm thuần `decide()`; ai được làm gì khai báo bằng quyền;
  test từng quy tắc BR-xx.
- `policy.ts`: phạm vi xem dữ liệu theo quyền, áp ở tầng query (người ngoài phạm vi nhận 404).
- `*.service.ts`: ghi trong `db.transaction`, khóa dòng `.for("update")`, kiểm `version`, `writeAudit(tx, ...)` cùng transaction,
  đẩy job SAU commit.
- `*.controller.ts`: mỏng, `@RequirePermission(...)`, input qua `new ZodPipe(schemaTừShared)`, user qua `@CurrentUser()`.

## Quy ước bắt buộc

1. Import tương đối trong api/worker/packages phải có đuôi `.js` (ESM NodeNext).
2. Input ở mọi biên (HTTP, job, webhook) validate bằng Zod schema trong `packages/shared`. Không định nghĩa schema lần hai ở FE.
3. Lỗi nghiệp vụ: `throw new BusinessError("MODULE_REASON", "thông báo tiếng Việt", status)`. Không throw Error chung chung.
4. Đổi trạng thái chỉ qua state machine; không update cột `status` trực tiếp.
5. Tiền: số nguyên VND (`bigint` mode number), nhập qua `vndSchema`, tổng/thành tiền kiểm bằng `isValidVnd` (`@app/shared`).
   Thời gian: lưu UTC, hiển thị `Asia/Ho_Chi_Minh`.
6. Không hard-code secret; env mới phải thêm vào schema env (`apps/api/src/config/env.ts`) và `.env.example`.
7. Endpoint công khai phải gắn `@Public()` và có lý do trong spec.
8. Không kiểm tên vai trò trong mã. Không thêm cột/enum vai trò. Quyền mới: thêm vào danh mục, có nhãn tiếng Việt.

## Quy trình làm việc

- Yêu cầu mới chưa có spec: `/business-flow`, dừng lại chờ duyệt.
- Có spec đã duyệt: `/feature docs/specs/NNN-xxx.md` (lát cắt dọc: schema -> service + test -> controller -> UI -> E2E).
- Đổi schema DB: theo `/db-migration`. Đụng auth, phân quyền, upload, xuất dữ liệu: chạy `/security-audit`.
- Không tự thêm thư viện; cần thì nêu lý do và chờ đồng ý. Không sửa ngoài phạm vi task, thấy vấn đề thì ghi cuối báo cáo.
- Không chắc về nghiệp vụ: hỏi, không đoán.

## Ngôn ngữ

Spec, tài liệu, UI, thông báo lỗi cho người dùng, tên test: tiếng Việt có dấu.
Tên biến, hàm, bảng, cột, mã lỗi, commit message (Conventional Commits): tiếng Anh.

## Báo cáo khi xong

Ngắn gọn: đã làm gì, file chính, cách kiểm tra, rủi ro còn lại.
