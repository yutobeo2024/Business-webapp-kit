import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
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
