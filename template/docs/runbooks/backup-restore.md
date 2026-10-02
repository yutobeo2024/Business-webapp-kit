# Sao lưu, khôi phục, diễn tập

| Việc                      | Khi nào                                              | Cách                                         |
| ------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| Sao lưu                   | 02:00 hằng ngày (cron) và trước mỗi deploy/khôi phục | `infra/backup-db.sh`                         |
| Diễn tập khôi phục        | 03:00 ngày 1 hằng tháng (cron)                       | `infra/restore-drill.sh`                     |
| Kiểm tra tuổi bản sao lưu | mỗi 10 phút (cron)                                   | `infra/alert-check.sh` cảnh báo nếu > 26 giờ |

- Định dạng `pg_dump -Fc`, kiểm đọc lại được bằng `pg_restore --list`, có checksum SHA-256.
- Lưu cục bộ `/opt/backups/postgres` 14 ngày (`BACKUP_KEEP_DAYS`), bản sao đẩy ra `BACKUP_REMOTE`.
  Đặt quy tắc lưu trữ phía remote (ví dụ 30 bản ngày, 12 bản tháng). Không có remote thì KHÔNG đạt chuẩn 3-2-1.
- RPO mặc định 24 giờ. Cần RPO thấp hơn: bật WAL archiving (pgBackRest/WAL-G) hoặc dùng PostgreSQL managed có PITR. Ghi ADR.

## Khôi phục production

1. Xác định thời điểm cần khôi phục và bản sao lưu tương ứng (tải từ remote nếu cần: `rclone copy <remote>/<file> /opt/backups/postgres/`).
2. Thông báo người dùng hệ thống tạm dừng.
3. `infra/restore-db.sh /opt/backups/postgres/<file>.dump` (tự sao lưu trạng thái hiện tại trước, hỏi xác nhận tên DB).
4. Kiểm dữ liệu với người dùng nghiệp vụ, ghi vào postmortem phần dữ liệu bị mất kể từ bản sao lưu.
