import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Origin hợp lệ của frontend, dùng cho kiểm tra CSRF và CORS. Ví dụ https://app.congty.vn */
  APP_ORIGIN: z.url(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(12),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  /** Số reverse proxy đứng trước API (Caddy = 1). Cần đúng để lấy IP thật cho rate limit và audit. */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
});

export type Env = z.infer<typeof envSchema>;

/** Validate env lúc khởi động. Sai thì dừng ngay, chỉ in TÊN biến lỗi, không in giá trị (tránh lộ secret). */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const names = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Cấu hình môi trường không hợp lệ: ${names}`);
  }
  return parsed.data;
}

export const ENV = Symbol("ENV");
