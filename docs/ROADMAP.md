# Lộ trình và tiến độ kit

Cập nhật: 05/10/2026. Chi tiết từng bản: [CHANGELOG](../CHANGELOG.md); kết quả kiểm: [VERIFICATION](VERIFICATION.md).

## Đã xong

| Bản | Nội dung |
|---|---|
| 1.0.x | Sửa lỗi sau review toàn bộ |
| 1.1.0 - 1.3.0 | Lõi: phân quyền động, quản trị; tệp đính kèm, xuất Excel/PDF; thông báo, email, Zalo, nhập Excel |
| 1.4.x | Sửa theo dogfood (dự án tam-ung), CI thật trên GitHub |
| 1.5.0 | `kit-sync` + `/kit-upgrade`: nâng dự án đã tạo lên bản kit mới |
| 1.6.x | Deploy thật lên VPS dùng chung (Caddy của máy), rollback, sao lưu Google Drive mã hóa |
| 1.7.0 | Build một lần rồi đưa đúng image staging lên production; nhiều môi trường (instance) trên một máy |

## Đang làm: 1.8.0 giao diện

Lý do: người dùng xem app thật thấy "giao diện xấu" (menu ngang dồn, không khung trang, không bộ component, không
thương hiệu).

Đã chốt:
- Bộ component shadcn/ui + Radix (thêm lucide-react, sonner, font Be Vietnam Pro tự host).
- Khung: sidebar trái có nhóm và menu con, thu gọn được; điện thoại dùng ngăn kéo.
- Đổi màu theo khách hàng ở một chỗ (`brand.json` -> token CSS), chữ trên nút tự chọn trắng/đen đủ tương phản; màu
  trạng thái cố định; sáng/tối.
- Phong cách: tạm chốt "phương án B" (bảng điều khiển vận hành sinh động: ô số liệu có biểu đồ nhỏ, chip icon pastel,
  biểu đồ, bảng/Kanban, trang chi tiết có bước duyệt và tab). Bản mẫu HTML: `docs/ui-mau/phuong-an-b.html` (A: `phuong-an-a.html`), mở bằng trình duyệt.

Đã xong trên nhánh `kit-1.8.0` (05/10/2026, chưa đẩy):
- Thử Google Stitch: sinh 9 màn app tạm ứng (theo B và bản tự do), so sánh, chốt GIỮ phương án B; Stitch chỉ dùng để
  phác màn (ghi trong `template/docs/ui.md`).
- Nền tảng: token, `brand.json` + `scripts/brand.mjs`, font, sáng/tối.
- Component, khung trang (thanh bên, thanh trên, tìm trang, menu tài khoản), làm lại các trang có sẵn.
- Luật cho agent: `.claude/rules/frontend.md`, `docs/ui.md`, `scripts/check-ui.mjs`.
- Kiểm: verify:quick, 31 test script, 17 e2e (11 cũ + 6 giao diện ở 375/768/1280px) xanh trên máy.

Việc tiếp theo:
1. Người dùng xem giao diện mới (chạy `pnpm dev` trong `template/`), góp ý.
2. Đẩy nhánh, kit-ci (with-sample, sample-removed, install) xanh.
3. Dogfood: kit-sync tam-ung 1.7.0 -> 1.8.0, sửa trang expenses sang component mới, xem trên staging rồi đưa lên
   production.
4. Chưa làm trong bản này: menu con trong thanh bên, trang `/ui` trưng bày component, skill `/ui-design`,
   `project:setup` hỏi màu thương hiệu.

## Việc treo

- 1.7.0: người dùng gắn tag `v0.2.0` vào commit `cd2e8bb` của tam-ung để kiểm job `promote`; thử tag commit chưa qua
  staging bị chặn; phát hành template 1.7.0 (`node scripts/publish-template.mjs 1.7.0`, người dùng đẩy).
- tam-ung: đóng PR #1 (cũ, đã nằm trong main), xem PR #5 (dependabot, đang đỏ).
- Dọn dẹp VPS: gỡ khóa SSH `claude-code-ydsg` khỏi user deploy khi thôi thử; đổi mật khẩu quản trị mặc định.
- Bước trivy trong kit-ci đôi khi lỗi tải cơ sở dữ liệu lỗ hổng (mạng): chạy lại job; cân nhắc thêm thử lại tự động.
