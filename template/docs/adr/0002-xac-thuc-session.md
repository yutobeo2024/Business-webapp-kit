# ADR-0002: Xác thực bằng session cookie

- Ngày: 2026-10-02
- Trạng thái: Chấp nhận

## Quyết định

Session lưu trong PostgreSQL (bảng `sessions`, chỉ lưu SHA-256 của token), cookie `sid` HttpOnly, Secure, SameSite=Lax.
Mật khẩu argon2id. Khóa tài khoản 15 phút sau 5 lần sai. Rate limit đăng nhập 10 lần/phút/IP.
Chống CSRF bằng kiểm Origin cho mọi request ghi. Phiên trượt, mặc định 12 giờ.

## Lý do

Thu hồi phiên tức thì (khóa nhân viên nghỉ việc), không có token dài hạn trong JavaScript, đơn giản để kiểm toán.
JWT không thu hồi được trước hạn nếu không thêm danh sách chặn, tức quay lại trạng thái có server.

## Mở rộng

Doanh nghiệp có AD/Microsoft 365/Google Workspace: thêm đăng nhập OIDC (hoặc Keycloak) trước lớp session hiện có; 2FA TOTP cho vai trò duyệt chi.
