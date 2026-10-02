#!/usr/bin/env bash
# Khôi phục DB production từ một file sao lưu. GHI ĐÈ dữ liệu hiện tại.
#   infra/restore-db.sh /opt/backups/postgres/<file>.dump
# Luôn sao lưu trạng thái hiện tại trước, nên có thể quay lại nếu khôi phục nhầm.
set -Eeuo pipefail
# shellcheck source=SCRIPTDIR/lib.sh
source "$(dirname "$0")/lib.sh"
load_env

FILE="${1:-}"
[[ -f "$FILE" ]] || die "Dùng: restore-db.sh <file.dump>"
if [[ -f "$FILE.sha256" ]]; then
  (cd "$(dirname "$FILE")" && sha256sum -c "$(basename "$FILE").sha256" --quiet) || die "Checksum không khớp, file hỏng"
fi

read -r -p "Sẽ GHI ĐÈ database '$POSTGRES_DB' bằng $(basename "$FILE"). Gõ đúng tên database để xác nhận: " CONFIRM
[[ "$CONFIRM" == "$POSTGRES_DB" ]] || die "Đã hủy"

"$INFRA_DIR/backup-db.sh" "pre-restore"
log "Dừng api và worker"
"${COMPOSE[@]}" stop api worker
trap 'log "Khôi phục lỗi, khởi động lại api/worker"; "${COMPOSE[@]}" start api worker' ERR

# --single-transaction: lỗi giữa chừng thì không để DB ở trạng thái dở dang.
"${COMPOSE[@]}" exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner --single-transaction < "$FILE"

"${COMPOSE[@]}" start api worker
wait_healthy 40 || die "Đã khôi phục nhưng API chưa healthy, kiểm tra log"
log "Khôi phục xong từ $(basename "$FILE")"
alert "Đã khôi phục DB từ $(basename "$FILE")"
