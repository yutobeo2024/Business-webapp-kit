# Giao diện

Mọi trang dùng chung một bộ token và component, nên app trông nhất quán, đổi màu theo khách hàng ở một chỗ và chạy được
ở cả chế độ sáng và tối, từ điện thoại 360px tới màn rộng.

## Thương hiệu của dự án

Sửa `apps/web/brand.json` rồi chạy `pnpm brand` (hoặc truyền thẳng tham số):

```
pnpm brand --name "Quản lý kho" --short "QK" --primary "#0B5FFF"
```

| Trường        | Ý nghĩa                                                                       |
| ------------- | ----------------------------------------------------------------------------- |
| `name`        | Tên ứng dụng: tab trình duyệt, thanh bên, trang đăng nhập                     |
| `shortName`   | 1 đến 3 ký tự trên ô logo và favicon mặc định                                 |
| `primary`     | Màu chủ đạo của khách (hex)                                                   |
| `primaryDark` | Tùy chọn: màu chủ đạo trên nền tối. Bỏ trống thì script tự làm sáng `primary` |
| `radius`      | Bo góc (px), 0 đến 20, mặc định 10                                            |

Script sinh `apps/web/src/brand.css` và `apps/web/public/favicon.svg`, tự tính:

- Màu nút: giữ màu của khách nếu chữ trắng đọc được; màu hơi nhạt thì làm nút đậm hơn một chút (giữ tông); màu nhạt hẳn
  (vàng, xanh nõn chuối) thì giữ màu và dùng chữ tối.
- Màu chữ liên kết và mục menu đang chọn: bản đậm hơn của màu chủ đạo, đạt tương phản WCAG AA trên nền trắng.
- Màu gần trắng bị từ chối kèm gợi ý.

Logo riêng: đặt tệp vào `apps/web/public/favicon.svg` (script không ghi đè tệp không do nó sinh). `brand.json`,
`brand.css`, `favicon.svg` là tệp của dự án: `kit-sync` không bao giờ ghi đè.

Màu trạng thái (thành công, cảnh báo, lỗi, thông tin) và bảng màu biểu đồ CỐ ĐỊNH, không đổi theo khách hàng: người dùng
học nghĩa của màu một lần.

## Token (apps/web/src/styles.css)

Trang chỉ dùng tên ngữ nghĩa, không dùng màu bảng Tailwind (`text-neutral-500`, `bg-white`, `bg-red-600`).

| Cần                                | Class                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Nền trang / nền thẻ / nền phụ      | `bg-background` / `bg-card` / `bg-muted`                                                    |
| Chữ thường / chữ phụ / chữ mờ nhất | `text-foreground` / `text-muted-foreground` / `text-faint`                                  |
| Tiêu đề, giá trị nổi bật           | `text-heading`                                                                              |
| Viền / viền ô nhập                 | `border-border` / `border-input`                                                            |
| Hành động chính                    | `bg-primary text-primary-foreground` (dùng `Button`)                                        |
| Liên kết, mục đang chọn            | `text-primary-text`, nền `bg-primary-soft`                                                  |
| Trạng thái                         | `text-success`, `text-warning`, `text-destructive`, `text-info` (nền nhạt: `bg-success/12`) |
| Biểu đồ                            | `chart-1` (màu thương hiệu) đến `chart-6`                                                   |
| Bóng thẻ / bóng lớp nổi            | `shadow-card` / `shadow-pop`                                                                |
| Chữ số thẳng cột                   | `num`                                                                                       |

`node scripts/check-ui.mjs` liệt kê chỗ còn dùng màu viết cứng hoặc `window.confirm`; chạy trong `pnpm verify:quick`
(cảnh báo, không làm hỏng lệnh). Khi các trang của dự án đã sạch, thêm `node scripts/check-ui.mjs --strict` vào CI để chặn hẳn.

## Component (apps/web/src/components/ui)

| Component                                                                          | Dùng khi                                                                                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `PageHeader`                                                                       | Đầu MỌI trang: tiêu đề, mô tả, đường dẫn, nút hành động                                                                        |
| `FilterBar` + `SearchInput`, `Select`                                              | Hàng lọc phía trên bảng                                                                                                        |
| `DataTable`, `Th`, `SortTh`, `Pagination`                                          | Mọi danh sách: đủ trạng thái tải, lỗi, rỗng; cuộn ngang trong khung                                                            |
| `Badge`                                                                            | Trạng thái của bản ghi. `tone` theo nghĩa: `green` xong, `amber` đang chờ, `blue` đang xử lý, `red` từ chối, `muted` nháp/đóng |
| `MoneyText`                                                                        | Số tiền VND (không ngắt dòng giữa số và ₫); ô bảng thêm `text-right`                                                           |
| `DescriptionList`                                                                  | Thông tin một bản ghi trên trang chi tiết (nhãn và giá trị)                                                                    |
| `Card`, `SectionCard`                                                              | Khối nội dung; `SectionCard` có tiêu đề và hành động                                                                           |
| `StatCard`, `Sparkline`                                                            | Ô số liệu trên trang tổng quan                                                                                                 |
| `EmptyState`, `Skeleton`                                                           | Chưa có dữ liệu / đang tải                                                                                                     |
| `Field`, `Input`, `Textarea`, `Select`, `Checkbox`, `CheckboxGroup`, `FormSection` | Form (React Hook Form + schema ở `packages/shared`)                                                                            |
| `Dialog`, `DialogActions`, `ConfirmDialog`                                         | Form ngắn và xác nhận; trên điện thoại hiện sát đáy                                                                            |
| `DropdownMenu*`, `Tooltip`                                                         | Menu ba chấm của hàng, chú thích cho nút chỉ có icon                                                                           |
| `toast`                                                                            | Báo thao tác ghi THÀNH CÔNG (`toast.success("Đã lưu")`). Lỗi vẫn hiện tại chỗ với `role="alert"`                               |
| `Button`, `buttonVariants`                                                         | Nút; `buttonVariants` cho `<Link>` trông như nút                                                                               |

Icon: `lucide-react`, kèm `aria-hidden`; nút chỉ có icon phải có `aria-label`.

## Khung trang

- Menu: thêm mục vào `apps/web/src/app/nav.ts` (nhóm, icon, quyền). Thanh bên thu gọn được; dưới 1024px thành ngăn kéo.
- Thanh trên có sẵn: tìm trang (Ctrl+K), chuông thông báo, menu tài khoản (đổi mật khẩu, cài đặt thông báo, sáng/tối,
  đăng xuất). Module nghiệp vụ không tự làm lại các thứ này.

## Mẫu trang

- Danh sách: `features/admin/users-page.tsx` (`PageHeader` + `FilterBar` + `DataTable` + `Pagination`, form trong `Dialog`).
- Tổng quan: `features/home/home-page.tsx` (`SectionCard`, lối tắt; thêm hàng `StatCard` cho số liệu nghiệp vụ).
- Chi tiết: `PageHeader` có `breadcrumb` và nút theo `allowedEvents`, bên dưới `SectionCard` chứa `DescriptionList`.

## Yêu cầu với mọi trang mới

1. Dùng được ở 360px: không cuộn ngang cả trang (bảng cuộn trong khung), nút và ô chạm cao tối thiểu 40px.
2. Đúng ở cả sáng và tối: chỉ dùng token.
3. Mã chứng từ, số tiền, ngày, huy hiệu không ngắt dòng (`whitespace-nowrap`; `MoneyText`, `Badge` đã lo sẵn).
4. Có đủ trạng thái đang tải, rỗng, lỗi kèm thử lại.

## Phác màn bằng Google Stitch (tùy chọn)

Khi cần hình dung màn mới trước khi viết mã, có thể dùng Stitch (MCP `https://stitch.googleapis.com/mcp`, khóa API của
người dùng) để sinh ảnh màn theo bộ quy tắc ở trên, rồi dựng lại bằng component của kit. Không chép HTML của Stitch vào
app. Stitch hay để "₫" rớt dòng và bảng tràn ngang: các component ở trên đã chặn sẵn, cứ dùng chúng.
