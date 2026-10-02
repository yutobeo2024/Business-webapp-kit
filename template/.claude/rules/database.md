---
paths:
  - "packages/db/**"
---

# Database

- Bảng nghiệp vụ: `id uuid defaultRandom()`, `created_at`, `updated_at` (`$onUpdate`), `deleted_at` nếu xóa mềm, `version` nếu sửa đồng thời.
- Tên bảng snake_case số nhiều; cột snake_case; enum dùng hằng số từ `packages/shared`.
- Mỗi foreign key và cột lọc thường xuyên có index.
- Quy trình: sửa `src/schema.ts` -> `pnpm db:generate --name <ten>` -> đọc SQL sinh ra -> commit cả `migrations/`.
- Migration đã commit KHÔNG được sửa (hook chặn). Cần SQL tùy chỉnh (backfill nhỏ, CREATE INDEX CONCURRENTLY):
  `pnpm --filter @app/db exec drizzle-kit generate --custom --name <ten>` rồi điền vào file mới.
- Đổi tên/xóa cột, thêm NOT NULL cho cột đã có dữ liệu: bắt buộc expand/contract qua 2 release (xem `/db-migration`).
- Cấm `drizzle-kit push` (bỏ qua lịch sử migration). Không đặt logic nghiệp vụ trong trigger.
