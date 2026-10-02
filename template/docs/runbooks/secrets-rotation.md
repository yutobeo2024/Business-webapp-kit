# Đổi secret

Đổi định kỳ 12 tháng, và NGAY khi nhân sự có quyền nghỉ việc hoặc nghi lộ.

| Secret                   | Cách đổi                                                                                                                                                              | Ảnh hưởng                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `POSTGRES_PASSWORD`      | `ALTER USER app PASSWORD '...'` qua `docker compose exec postgres psql`, sửa cả `POSTGRES_PASSWORD` và `DATABASE_URL` trong `.env`, `docker compose up -d api worker` | Gián đoạn vài giây         |
| `REDIS_PASSWORD`         | Sửa `.env` (cả `REDIS_URL`), `docker compose up -d redis api worker`                                                                                                  | Job đang chờ vẫn giữ (AOF) |
| Phiên người dùng         | `DELETE FROM sessions;`                                                                                                                                               | Mọi người đăng nhập lại    |
| Khóa SSH deploy          | Tạo khóa mới, thêm vào `authorized_keys` của user deploy, cập nhật `DEPLOY_SSH_KEY`, xóa khóa cũ                                                                      | Không                      |
| Token GHCR trên máy chủ  | Tạo token mới quyền `read:packages`, `docker login ghcr.io` lại, thu hồi token cũ                                                                                     | Không                      |
| Webhook cảnh báo, rclone | Tạo mới ở dịch vụ tương ứng, sửa `.env` / `rclone config`                                                                                                             | Không                      |

Sau khi đổi: chạy `infra/alert-check.sh` và kiểm `/api/health`. Ghi ngày đổi vào sổ vận hành của khách.
