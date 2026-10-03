import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  /** Lưu tệp, như api (ADR-0005): hai bên phải trỏ cùng một thư mục. */
  STORAGE_DRIVER: z.enum(["local"]).default("local"),
  STORAGE_DIR: z.string().min(1).default(".data/files"),
  /** Xuất file: số job chạy song song (Chromium tốn RAM), hạn tải về, số dòng tối đa mỗi lần xuất. */
  EXPORT_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(2),
  EXPORT_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(24),
  EXPORT_MAX_ROWS: z.coerce.number().int().min(1).max(1_000_000).default(100_000),
  /** Địa chỉ app (giống api): để dựng liên kết tuyệt đối trong email. */
  APP_ORIGIN: z.url().default("http://localhost:5173"),
  /** Bật kênh email: smtp(s)://user:pass@host:port. Bỏ trống = không gửi email (chỉ thông báo trong app). */
  SMTP_URL: z
    .string()
    .optional()
    .transform((v) => v || undefined),
  MAIL_FROM: z.string().min(3).default("Hệ thống <no-reply@localhost>"),
  /** Đường dẫn Chromium trong image production; bỏ trống khi dev (dùng trình duyệt Playwright đã cài). */
  CHROMIUM_PATH: z.string().min(1).optional(),
});
export type WorkerEnv = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  const r = schema.safeParse(source);
  if (!r.success) {
    throw new Error(
      `Cấu hình môi trường không hợp lệ: ${r.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  }
  return r.data;
}
