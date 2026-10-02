# Bảo mật (luôn áp dụng)

- Mọi endpoint mặc định yêu cầu đăng nhập (SessionGuard toàn cục). Chỉ `@Public()` khi spec ghi rõ.
- Kiểm quyền theo cả hành động (state machine) VÀ phạm vi dữ liệu (policy, lọc ở query). Chống IDOR: không có quyền xem thì trả 404.
- Request ghi dữ liệu đi qua OriginGuard (chống CSRF). Không thêm ngoại lệ.
- Không trả stack trace, SQL, đường dẫn nội bộ trong response. HttpExceptionFilter đã chuẩn hóa, không bypass.
- Không log mật khẩu, token, cookie, số CCCD, số tài khoản, dữ liệu sức khỏe. Pino đã redact cookie/authorization.
- SQL thô chỉ qua template `sql\`...\`` của Drizzle (tham số hóa). Cấm nối chuỗi vào câu SQL.
- Upload: giới hạn dung lượng, kiểm MIME thật, lưu object storage tên ngẫu nhiên, tải xuống qua URL ký có hạn.
- Thao tác nhạy cảm (duyệt, xóa, đổi quyền, xuất hàng loạt) phải `writeAudit` trong cùng transaction.
- Dữ liệu cá nhân: chỉ thu thập trường cần cho nghiệp vụ, ghi mục đích và thời gian lưu trong spec.
