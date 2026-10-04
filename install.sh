#!/usr/bin/env bash
# Tạo dự án mới từ kit. Dùng: ./install.sh <thư-mục-dự-án-mới>
set -Eeuo pipefail
VERSION="1.3.0"
SRC="$(cd "$(dirname "$0")/template" && pwd)"
FORCE=0
[[ "${1:-}" == "--force" ]] && { FORCE=1; shift; }
DEST="${1:-}"
[[ -n "$DEST" ]] || { echo "Dùng: ./install.sh [--force] <thư-mục-dự-án-mới>"; exit 1; }

# Dự án khóa Node 22/24 LTS (engine-strict): Node khác thì mọi lệnh pnpm lồng nhau, kể cả hook Stop của Claude Code, đều lỗi.
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo none)"
if [[ "$NODE_MAJOR" != "22" && "$NODE_MAJOR" != "24" && "$FORCE" != "1" ]]; then
  cat >&2 <<NODE
Cần Node 22 hoặc 24 LTS, máy đang có: $NODE_MAJOR.
Cài Node 24 bên cạnh bản hiện có rồi chạy lại, ví dụ:
  fnm install 24 && fnm use 24        (Windows: winget install Schniz.fnm)
  nvm install 24 && nvm use 24        (macOS/Linux: nvm; Windows: nvm-windows)
Vẫn muốn tạo thư mục dự án (tự lo Node sau): ./install.sh --force <thư-mục>
NODE
  exit 1
fi
if [[ -d "$DEST" && -n "$(ls -A "$DEST" 2>/dev/null)" ]]; then
  echo "Thư mục $DEST không trống. Kit chỉ tạo dự án mới; dự án có sẵn hãy chép thủ công phần cần dùng."; exit 1
fi
mkdir -p "$DEST"
tar -C "$SRC" --exclude=node_modules --exclude=dist --exclude=.turbo --exclude=.git --exclude=.env \
  --exclude=test-results --exclude=playwright-report --exclude=coverage --exclude=.data -cf - . | tar -C "$DEST" -xf -
chmod +x "$DEST"/infra/*.sh
cp "$DEST/.env.example" "$DEST/.env"
# Git trên Windows (core.filemode=false) bỏ bit +x: đặt lại trong index để máy chủ Linux chạy được script.
( cd "$DEST" && git init -q -b main && git add -A && git update-index --chmod=+x infra/*.sh \
  && git -c commit.gpgsign=false commit -qm "chore: khởi tạo từ business-webapp-kit $VERSION" ) \
  || echo "Không tạo được commit đầu (thiếu git hoặc chưa cấu hình user.name/email). Tự commit sau, trước đó chạy: git update-index --chmod=+x infra/*.sh"
cat <<MSG
Đã tạo dự án tại $DEST
Tiếp theo:
  cd "$DEST"
  # sửa SEED_ADMIN_PASSWORD trong .env và phần <...> trong CLAUDE.md
  pnpm install && pnpm dev:services && pnpm build && pnpm db:migrate && pnpm db:seed -- --demo
  pnpm verify:quick && pnpm claude:selftest
Nhánh chính là main (CI/CD chạy khi push main và tag vX.Y.Z).
MSG
