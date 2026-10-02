# Lựa chọn stack

Tiêu chí theo thứ tự ưu tiên: dữ liệu doanh nghiệp không được sai hay mất; một đội nhỏ bảo trì được nhiều năm;
AI agent code đúng nhiều nhất với ít hướng dẫn nhất; chi phí vận hành hợp với doanh nghiệp Việt Nam.

Lựa chọn quan trọng nhất cho AI coding là TypeScript đầu cuối cùng một bộ Zod schema dùng chung frontend và backend:
AI sửa một trường dữ liệu thì typecheck chỉ ra mọi nơi bị ảnh hưởng, hook bắt được ngay và AI tự sửa.

## Stack A: Chuẩn (skeleton trong kit, khoảng 80% dự án)

App nội bộ 20 đến 500 người dùng, nhiều bước duyệt, phân quyền theo phòng ban/chi nhánh, có báo cáo và tích hợp.

| Thành phần | Chọn | Lý do |
|---|---|---|
| Monorepo | pnpm 10 + Turborepo 2 | Chia sẻ schema/type; cache làm `verify:quick` nhanh; `turbo prune` cho image gọn |
| Backend | NestJS 12 (ESM) | Module/DI/guard theo quy ước chặt, AI bám khuôn tốt |
| ORM | Drizzle | Không engine nhị phân; schema TypeScript; migration SQL đọc và review được |
| Database | PostgreSQL 17 | Transaction, khóa dòng, JSONB; đủ cho hầu hết doanh nghiệp |
| Job nền | BullMQ + Redis 7 | Thông báo, xuất file, đồng bộ có retry, lịch định kỳ |
| Luồng trạng thái | State machine dạng bảng + hàm thuần | Quy trình duyệt hay đổi; khai báo dạng bảng dễ sửa và test hơn engine BPMN |
| Xác thực | Session cookie + argon2id | Thu hồi phiên tức thì; xem ADR-0002 trong template |
| Frontend | React 19 + Vite, TanStack Router/Query, Tailwind 4, React Hook Form | SPA sau đăng nhập không cần SSR; mã component nằm trong repo |
| Kiểm thử | Vitest, Supertest trên DB thật, Playwright | Không mock luồng ghi dữ liệu |
| CI/CD | GitHub Actions + GHCR | Không phải nuôi server CI |
| Hạ tầng | 1 VPS + Docker Compose + Caddy | Rẻ, dễ bàn giao; xem ADR-0003 |

Phiên bản đã ghim và kiểm: Node 24 LTS (kiểm trên 22.22), TypeScript 6.0.3 (typescript-eslint chưa hỗ trợ TS 7),
NestJS 12.1, Drizzle ORM 0.45, React 19.3, Vite 8.3, Vitest 5.0, ESLint 10.

## Stack B: Gọn

Dưới 50 người dùng, 1 đến 3 quy trình, một người làm, cần ra bản đầu rất nhanh. Next.js full-stack + Drizzle + PostgreSQL.
Đánh đổi: ranh giới FE/BE mờ, khó tách worker hay mở API cho bên thứ ba sau này, cơ chế cache/server component là nơi AI
hay sinh lỗi khó thấy. Dự án có khả năng lớn lên thì dùng Stack A ngay. Lớp `.claude/` và CI của kit vẫn dùng được,
cần chỉnh rules và Dockerfile.

## Stack C: Doanh nghiệp lớn hoặc tuân thủ cao

Trên 500 người dùng, nhiều chi nhánh, SSO với hệ thống sẵn có, SLA cam kết, dữ liệu nhạy cảm (y tế, tài chính).
Stack A cộng thêm, từng phần khi có yêu cầu cụ thể: Keycloak/OIDC (SSO, AD); Temporal cho quy trình kéo dài nhiều ngày có
hạn xử lý và leo thang; PostgreSQL managed có PITR hoặc replica; OpenTelemetry + Prometheus + Grafana; nhiều máy chủ
hoặc Kubernetes; hạ tầng trong nước khi khách yêu cầu lưu trữ dữ liệu tại Việt Nam.

## Khi cần Python
OCR, AI, phân tích dữ liệu nặng: service FastAPI riêng, giao tiếp qua hàng đợi hoặc HTTP nội bộ. Không trộn hai ngôn ngữ
trong cùng backend nghiệp vụ.
