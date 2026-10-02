---
paths:
  - "**/*.spec.ts"
  - "**/*.int.spec.ts"
  - "e2e/**"
---

# Kiểm thử

- Unit (`*.spec.ts`): Vitest, cho hàm thuần (state machine, policy, schema, format).
- Tích hợp (`*.int.spec.ts`): PostgreSQL + Redis THẬT qua `test/helpers.ts` (`openDb`, `resetDb`, `seedFixture`). Không mock luồng ghi DB.
- E2E (`e2e/`): Playwright, chỉ cho tiêu chí nghiệm thu chính trong spec, dùng tài khoản từ `pnpm db:seed -- --demo`.
- Tên test là hành vi tiếng Việt và dẫn mã quy tắc: `it("BR-02: trưởng phòng khác phòng ban bị chặn")`.
- Cấm: xóa hoặc `.skip` test đang đỏ, sửa assertion cho khớp kết quả sai, hạ ngưỡng kiểm tra để qua CI.
