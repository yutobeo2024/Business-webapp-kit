# <Tên dự án>

Web app quản lý quy trình nghiệp vụ cho <khách hàng>.

## Chạy môi trường dev

Yêu cầu: Node 24 (xem `.nvmrc`), pnpm 10 (`corepack enable`), Docker.

```bash
cp .env.example .env              # đổi SEED_ADMIN_PASSWORD
pnpm install
pnpm dev:services                 # PostgreSQL + Redis
pnpm build && pnpm db:migrate
pnpm db:seed -- --demo            # vai trò mặc định, tài khoản quản trị + tài khoản demo (mật khẩu = SEED_ADMIN_PASSWORD)
pnpm dev                          # API :3000, web :5173
```

Đăng nhập bằng `SEED_ADMIN_EMAIL`: menu Người dùng, Vai trò, Phòng ban để tạo tài khoản thật và cấu hình quyền.

## Kiểm tra

```bash
pnpm verify:quick                                             # lint + typecheck + unit test
DATABASE_URL=postgresql://app:app@localhost:5432/app_test \
REDIS_URL=redis://localhost:6379/15 pnpm test:integration     # DB và Redis thật
pnpm claude:selftest                                          # tự kiểm hook Claude Code
```

## Tài liệu

- Làm việc với Claude Code: `CLAUDE.md`, `.claude/`
- Trước khi giao khách: `docs/PRODUCTION-CHECKLIST.md`
- Nghiệp vụ: `docs/specs/`. Kiến trúc: `docs/adr/`. Vận hành: `docs/runbooks/`
