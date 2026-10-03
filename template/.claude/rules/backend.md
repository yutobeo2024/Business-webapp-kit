---
paths:
  - "apps/api/**/*.ts"
  - "apps/worker/**/*.ts"
  - "packages/server/**/*.ts"
---

# Backend

- Import tương đối có đuôi `.js`. Inject token (`DB`, `ENV`, `NOTIFICATIONS_QUEUE`) bằng `@Inject(TOKEN)`.
- Controller mỏng: `@RequirePermission("module.action")` (ở class hoặc handler), `@Body(new ZodPipe(schema))`,
  `@Param("id", new ZodPipe(z.uuid()))`, gọi service, trả DTO.
- Quyền: kiểm bằng `can(actor, "...")` (state machine, policy, service). Cấm `actor.role`, cấm so tên vai trò. Quyền của
  module khai báo trong shared (`XXX_PERMISSIONS`, nhãn tiếng Việt nói rõ cho phép gì) và đăng ký vào `PERMISSIONS`.
  Phạm vi xem dữ liệu là quyền có cấp (`x.view.all` > `x.view.department` > của mình), xem
  `packages/server/src/purchase-requests/policy.ts`.
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
  `orderBy(sort, order, SORTABLE, bảng.id)`, `paginated` (`@app/server`). Cột sắp xếp tra trong bảng `SORTABLE`
  (`satisfies Record<Query["sort"], unknown>`), không bao giờ ghép tên cột từ input. Mẫu: `listPurchaseRequests`
  (`packages/server/src/purchase-requests/queries.ts`).
- Truy vấn đọc mà worker cũng cần (xuất file, báo cáo, thông báo) đặt trong `packages/server` và dùng ở cả hai nơi.
  Không chép truy vấn hay điều kiện phạm vi xem sang worker.
- Tệp: chỉ qua `storeFile` (trong `withStoredFile`, cùng transaction với audit) với danh sách loại cho phép của module;
  tải về chỉ qua `sendFile` sau khi kiểm quyền xem bản ghi chứa tệp. Không ghi đĩa trực tiếp, không dùng tên tệp người
  dùng làm đường dẫn. Mẫu: `PurchaseRequestAttachmentsService`.
- Xuất file: không bao giờ sinh file trong request HTTP. Thêm loại vào danh mục xuất + runner trong worker (spec 002);
  runner lấy dữ liệu bằng hàm trong `packages/server` với `ctx.actor` (quyền hiện tại của người yêu cầu).
- Mỗi quy tắc BR-xx có test: unit test cho `decide()`/policy, test tích hợp cho luồng ghi DB.
