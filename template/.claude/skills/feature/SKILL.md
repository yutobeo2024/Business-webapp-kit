---
name: feature
description: Triển khai tính năng từ spec đã duyệt theo lát cắt dọc (schema, service + test, controller, UI, E2E) với điều kiện hoàn thành rõ ràng. Dùng khi bắt đầu code một tính năng hoặc module nghiệp vụ.
argument-hint: "<docs/specs/NNN-xxx.md> [phần cần làm]"
---

# Triển khai tính năng theo lát cắt dọc

Spec: $ARGUMENTS

## 0. Điều kiện

Spec phải "Đã duyệt". Chưa thì dừng, đề nghị `/business-flow` hoặc duyệt spec.

## 1. Kế hoạch (chưa code)

- Đọc spec, `CLAUDE.md`, module mẫu `apps/api/src/modules/purchase-requests/` và module liên quan.
- Chia lát cắt theo HÀNH VI người dùng thấy được end-to-end ("lập phiếu nháp", "gửi duyệt", "duyệt/từ chối"), không chia theo tầng.
- Mỗi lát ghi: file tạo/sửa, migration (nếu có), test sẽ viết, BR/AC đáp ứng. Trình bày, chờ người dùng đồng ý.

## 2. Mỗi lát cắt

1. Zod schema + type trong `packages/shared`. Lát cắt đầu của module mới: khai báo quyền (`XXX_PERMISSIONS`, nhãn tiếng
   Việt) và đăng ký vào `PERMISSIONS`; đề xuất vai trò mặc định trong `apps/api/src/auth/default-roles.ts`.
2. Đổi schema DB thì theo `/db-migration`.
3. State machine/policy (hàm thuần) + unit test cho từng BR, kể cả trường hợp bị chặn. Viết test trước, code sau.
4. Service (transaction, khóa dòng, version, audit) + test tích hợp trên DB thật.
5. Controller (`@RequirePermission`, ZodPipe, CurrentUser). Module mới thì đăng ký vào `app.module.ts`.
6. UI: hook trong `features/<module>/api.ts`, trang, form, đủ trạng thái tải/rỗng/lỗi. Danh sách theo mẫu danh sách
   (rule frontend); route mới thêm vào `router.tsx` và menu `NAV` kèm quyền.
7. Spec có đính kèm hoặc xuất Excel/PDF: dùng lõi tệp và xuất file (spec 002, mẫu ở module phiếu đề nghị), không tự
   viết. Truy vấn đọc mà worker cũng cần đặt trong `packages/server`.
8. E2E nếu lát cắt thuộc AC chính.
9. `pnpm verify:quick` xanh mới sang lát tiếp.

## 3. Hoàn thành khi

- Mọi AC trong phạm vi có test tương ứng và xanh (cả `pnpm test:integration`).
- Không còn TODO, console.log, code chết. Không thêm thư viện chưa được duyệt.
- Đã chạy subagent `code-reviewer` và sửa hết mục CHẶN MERGE.
- Báo cáo: lát đã xong, AC đã đáp ứng, việc còn lại, rủi ro.
