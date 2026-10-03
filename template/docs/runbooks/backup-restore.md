# Sao lưu, khôi phục, diễn tập

| Việc                      | Khi nào                                              | Cách                                         |
| ------------------------- | ---------------------------------------------------- | -------------------------------------------- |
| Sao lưu                   | 02:00 hằng ngày (cron) và trước mỗi deploy/khôi phục | `infra/backup-db.sh`                         |
| Diễn tập khôi phục        | 03:00 ngày 1 hằng tháng (cron)                       | `infra/restore-drill.sh`                     |
| Kiểm tra tuổi bản sao lưu | mỗi 10 phút (cron)                                   | `infra/alert-check.sh` cảnh báo nếu > 26 giờ |

- Định dạng `pg_dump -Fc`, kiểm đọc lại được bằng `pg_restore --list`, có checksum SHA-256.
- Lưu cục bộ `/opt/backups/postgres` 14 ngày (`BACKUP_KEEP_DAYS`), bản sao đẩy ra `BACKUP_REMOTE`.
  Đặt quy tắc lưu trữ phía remote (ví dụ 30 bản ngày, 12 bản tháng). Không có remote thì KHÔNG đạt chuẩn 3-2-1
  (`alert-check.sh` cảnh báo khi `BACKUP_REMOTE` trống).
- Remote phải là loại `crypt` của rclone (bản sao lưu chứa toàn bộ dữ liệu khách, không để dạng rõ ở dịch vụ lưu trữ).
  Giữ mật khẩu crypt ở nơi khác máy chủ: mất mật khẩu là mất bản sao lưu. Nên bật versioning/object lock phía lưu trữ
  và dùng khóa chỉ có quyền ghi, để máy chủ bị chiếm cũng không xóa được bản sao lưu cũ.
- RPO mặc định 24 giờ. Cần RPO thấp hơn: bật WAL archiving (pgBackRest/WAL-G) hoặc dùng PostgreSQL managed có PITR. Ghi ADR.

## Khôi phục production

1. Xác định thời điểm cần khôi phục và bản sao lưu tương ứng. Tải từ remote nếu cần, CẢ file `.dump` lẫn `.dump.sha256`
   (thiếu file checksum thì script không kiểm được file có nguyên vẹn không):
   `rclone copy <remote>/ /opt/backups/postgres/ --include "<file>.dump*"`.
2. Thông báo người dùng hệ thống tạm dừng.
3. `infra/restore-db.sh /opt/backups/postgres/<file>.dump` (tự sao lưu trạng thái hiện tại trước, hỏi xác nhận tên DB).
   Script xóa sạch schema rồi nạp lại trong một transaction: bảng do migration mới hơn tạo ra cũng mất, lịch sử migration
   quay về lúc sao lưu. File hỏng thì dừng trước khi đụng DB. Sau khi khôi phục, image đang chạy phải khớp schema cũ:
   nếu bản sao lưu cũ hơn lần phát hành gần nhất, rollback image về bản tương ứng hoặc deploy lại để chạy migration.
4. Kiểm dữ liệu với người dùng nghiệp vụ, ghi vào postmortem phần dữ liệu bị mất kể từ bản sao lưu.
