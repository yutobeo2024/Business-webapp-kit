#!/usr/bin/env bash
# Kiểm tra sức khỏe máy chủ mỗi 10 phút (cron), gửi cảnh báo khi có vấn đề. Chống spam: cùng một lỗi chỉ báo lại sau 6 giờ.
set -Euo pipefail
# shellcheck source=SCRIPTDIR/lib.sh
source "$(dirname "$0")/lib.sh"
load_env

DIR="${BACKUP_DIR:-/opt/backups/postgres}"
STATE="$INFRA_DIR/.alert-state"
touch "$STATE"
problems=()

for mount in / /var/lib/docker; do
  [[ -d "$mount" ]] || continue
  used=$(df -P "$mount" | awk 'NR==2 {gsub("%","",$5); print $5}')
  (( used >= 85 )) && problems+=("Ổ đĩa $mount đã dùng ${used}%")
done

if [[ -f "$DIR/.last-success" ]]; then
  age_h=$(( ( $(date +%s) - $(cat "$DIR/.last-success") ) / 3600 ))
  (( age_h > 26 )) && problems+=("Bản sao lưu gần nhất đã ${age_h} giờ")
else
  problems+=("Chưa có bản sao lưu thành công nào")
fi

if [[ -f "$DIR/.last-drill" ]]; then
  age_d=$(( ( $(date +%s) - $(cat "$DIR/.last-drill") ) / 86400 ))
  (( age_d > 35 )) && problems+=("Đã ${age_d} ngày chưa diễn tập khôi phục thành công")
fi

for svc in caddy web api worker postgres redis; do
  cid=$("${COMPOSE[@]}" ps -q "$svc" 2>/dev/null)
  if [[ -z "$cid" ]]; then problems+=("Container $svc không chạy"); continue; fi
  st=$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$cid" 2>/dev/null)
  [[ "$st" == running* && "$st" != *unhealthy* ]] || problems+=("Container $svc: $st")
done

app_healthy || problems+=("API không phản hồi /api/health qua HTTPS")

now=$(date +%s)
for p in "${problems[@]}"; do
  key=$(printf '%s' "$p" | sed 's/[0-9]\+/N/g' | sha1sum | cut -c1-12)
  last=$(grep "^$key " "$STATE" | cut -d' ' -f2 || true)
  if [[ -z "$last" ]] || (( now - last > 21600 )); then
    alert "$p"
    grep -v "^$key " "$STATE" > "$STATE.tmp" || true
    echo "$key $now" >> "$STATE.tmp"
    mv "$STATE.tmp" "$STATE"
  fi
done
# Hết lỗi thì xóa trạng thái để lần lỗi sau báo ngay.
(( ${#problems[@]} == 0 )) && : > "$STATE"
exit 0
