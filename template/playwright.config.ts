import { defineConfig, devices } from "@playwright/test";

// E2E chạy trên app đã build: API (cổng 3000) + web preview (cổng 4173, proxy /api).
// CI khởi động hai server này trước khi chạy. Local: `pnpm build` rồi `pnpm test:e2e`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4173",
    trace: "retain-on-failure",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
