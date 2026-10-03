---
paths:
  - "apps/api/**/*.ts"
  - "apps/worker/**/*.ts"
---

# Backend

- Import tương đối có đuôi `.js`. Inject token (`DB`, `ENV`, `NOTIFICATIONS_QUEUE`) bằng `@Inject(TOKEN)`.
- Controller mỏng: `@RequirePermission("module.action")` (ở class hoặc handler), `@Body(new ZodPipe(schema))`,
  `@Param("id", new ZodPipe(z.uuid()))`, gọi service, trả DTO.
- Quyền: kiểm bằng `can(actor, "...")` (state machine, policy, service). Cấm `actor.role`, cấm so tên vai trò. Quyền của
  module khai báo trong shared (`XXX_PERMISSIONS`, nhãn tiếng Việt nói rõ cho phép gì) và đăng ký vào `PERMISSIONS`.
  Phạm vi xem dữ liệu là quyền có cấp (`x.view.all` > `x.view.department` > của mình), xem `policy.ts`.
- Service: ghi nhiều bảng trong một `this.db.transaction(async (tx) => ...)`. Hàm phụ nhận `DbOrTx`.
- Cập nhật bản ghi có sửa đồng thời: `.for("update")` + điều kiện `version` + tăng `version`; lệch thì `Errors.versionConflict()`.
- Bộ đếm, tồn kho, số dư, hạn mức: KHÔNG đọc rồi ghi giá trị tuyệt đối (request song song ghi đè nhau). Đọc bằng
  `.for("update")` trong transaction rồi mới tính, hoặc cập nhật nguyên tử ``set({ n: sql`${t.n} + 1` })``.
  Mẫu: `AuthService.recordFailedLogin`.
- Tiền: trường nhập dùng `vndSchema`; số tiền tính ra (thành tiền, tổng) phải qua `isValidVnd` trong schema
  (từ `@app/shared`), nếu không tổng vượt 2^53 sẽ lưu sai hoặc lỗi 500.
- Gọi bên ngoài (email, Zalo, kế toán, xuất file nặng) đẩy sang worker; enqueue SAU commit, `jobId` theo phiên bản để không trùng.
- Processor trong worker phải idempotent (job có thể chạy lại khi retry).
- Danh sách: schema `listQuerySchema({ sortable, defaultSort })` + `.extend` bộ lọc; service dùng `searchCondition`,
  `orderBy(sort, order, SORTABLE, bảng.id)`, `paginated` (`common/list-query.ts`). Cột sắp xếp tra trong bảng `SORTABLE`
  (`satisfies Record<Query["sort"], unknown>`), không bao giờ ghép tên cột từ input. Mẫu: `PurchaseRequestsService.list`.
- Mỗi quy tắc BR-xx có test: unit test cho `decide()`/policy, test tích hợp cho luồng ghi DB.
