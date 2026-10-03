#!/usr/bin/env bash
# Tạo dự án mới từ kit. Dùng: ./install.sh <thư-mục-dự-án-mới>
set -Eeuo pipefail
VERSION="1.3.0"
SRC="$(cd "$(dirname "$0")/template" && pwd)"
DEST="${1:-}"
[[ -n "$DEST" ]] || { echo "Dùng: ./install.sh <thư-mục-dự-án-mới>"; exit 1; }
if [[ -d "$DEST" && -n "$(ls -A "$DEST" 2>/dev/null)" ]]; then
  echo "Thư mục $DEST không trống. Kit chỉ tạo dự án mới; dự án có sẵn hãy chép thủ công phần cần dùng."; exit 1
fi
mkdir -p "$DEST"
tar -C "$SRC" --exclude=node_modules --exclude=dist --exclude=.turbo --exclude=.git --exclude=.env \
  --exclude=test-results --exclude=playwright-report --exclude=coverage --exclude=.data -cf - . | tar -C "$DEST" -xf -
chmod +x "$DEST"/infra/*.sh
cp "$DEST/.env.example" "$DEST/.env"
# Git trên Windows (core.filemode=false) bỏ bit +x: đặt lại trong index để máy chủ Linux chạy được script.
( cd "$DEST" && git init -q && git add -A && git update-index --chmod=+x infra/*.sh \
  && git -c commit.gpgsign=false commit -qm "chore: khởi tạo từ business-webapp-kit $VERSION" ) \
  || echo "Không tạo được commit đầu (thiếu git hoặc chưa cấu hình user.name/email). Tự commit sau, trước đó chạy: git update-index --chmod=+x infra/*.sh"
cat <<MSG
Đã tạo dự án tại $DEST
Tiếp theo:
  cd "$DEST"
  # sửa SEED_ADMIN_PASSWORD trong .env và phần <...> trong CLAUDE.md
  pnpm install && pnpm dev:services && pnpm build && pnpm db:migrate && pnpm db:seed -- --demo
  pnpm verify:quick && pnpm claude:selftest
Cần Node 22 hoặc 24 LTS.
MSG
