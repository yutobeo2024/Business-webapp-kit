---
paths:
  - "apps/api/**/*.ts"
  - "apps/worker/**/*.ts"
---

# Backend

- Import tương đối có đuôi `.js`. Inject token (`DB`, `ENV`, `NOTIFICATIONS_QUEUE`) bằng `@Inject(TOKEN)`.
- Controller mỏng: `@Body(new ZodPipe(schema))`, `@Param("id", new ZodPipe(z.uuid()))`, gọi service, trả DTO.
- Service: ghi nhiều bảng trong một `this.db.transaction(async (tx) => ...)`. Hàm phụ nhận `DbOrTx`.
- Cập nhật bản ghi có sửa đồng thời: `.for("update")` + điều kiện `version` + tăng `version`; lệch thì `Errors.versionConflict()`.
- Gọi bên ngoài (email, Zalo, kế toán, xuất file nặng) đẩy sang worker; enqueue SAU commit, `jobId` theo phiên bản để không trùng.
- Processor trong worker phải idempotent (job có thể chạy lại khi retry).
- Danh sách luôn phân trang (`paginationQuerySchema`, tối đa 100) và sắp xếp ổn định (thêm `id` làm khóa phụ).
- Mỗi quy tắc BR-xx có test: unit test cho `decide()`/policy, test tích hợp cho luồng ghi DB.
