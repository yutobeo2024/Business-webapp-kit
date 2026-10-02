---
name: security-audit
description: Rà soát bảo mật thay đổi trên nhánh hiện tại theo OWASP và đặc thù app nghiệp vụ (phân quyền, IDOR, CSRF, audit, dữ liệu cá nhân). Dùng trước release hoặc khi đụng xác thực, phân quyền, upload, thanh toán, xuất dữ liệu.
context: fork
background: false
---

# Rà soát bảo mật

Phạm vi: !`git diff main...HEAD --stat 2>/dev/null || echo "Không lấy được diff so với main"`

Đọc `git diff main...HEAD` và `.claude/rules/security.md`. Với từng mục ghi Đạt / Không đạt / Không áp dụng kèm `file:dòng`:

1. Xác thực: endpoint mới có `@Public()` ngoài ý muốn? Phiên có hạn, đăng xuất xóa phiên?
2. Phân quyền: kiểm cả hành động (state machine) và phạm vi dữ liệu (policy ở query). Đổi id trên URL xem được dữ liệu người khác không?
3. CSRF: request ghi đi qua OriginGuard; không có endpoint ghi dùng GET.
4. Validate input ở mọi biên, kể cả webhook và payload job.
5. Injection: `sql` nối chuỗi, lệnh shell ghép từ input, HTML không escape (`dangerouslySetInnerHTML`).
6. Upload/tải file: MIME thật, dung lượng, đường dẫn, URL ký có hạn.
7. Lộ thông tin: response lỗi, log chứa dữ liệu nhạy cảm, secret trong mã hoặc lịch sử git.
8. Audit: thao tác nhạy cảm có ghi đủ ai, khi nào, IP, trước, sau, trong cùng transaction.
9. Rate limit cho đăng nhập, OTP, xuất dữ liệu, endpoint tốn tài nguyên.
10. Dependency mới: còn bảo trì, `pnpm audit --prod` sạch mức high.
11. Dữ liệu cá nhân: tối thiểu, có mục đích, có thời gian lưu.

Kết luận một dòng: ĐƯỢC RELEASE hoặc CHƯA ĐƯỢC RELEASE, kèm danh sách việc bắt buộc sửa.
