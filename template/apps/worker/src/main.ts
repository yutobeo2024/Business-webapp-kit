import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import pino from "pino";
import { createDb } from "@app/db";
import { QUEUES } from "@app/shared";
import { loadEnv } from "./env.js";
import { createProcessor, MAINTENANCE_JOBS } from "./processors.js";

const env = loadEnv();
const log = pino({ level: env.LOG_LEVEL, base: { service: "worker" } });
const handle = createDb(env.DATABASE_URL, { max: 5, appName: "worker" });
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker(QUEUES.notifications, createProcessor({ db: handle.db, log }), {
  connection,
  concurrency: env.WORKER_CONCURRENCY,
});

worker.on("failed", (job, err) =>
  log.error({ jobId: job?.id, name: job?.name, attempts: job?.attemptsMade, err }, "Job thất bại"),
);
worker.on("error", (err) => log.error({ err }, "Worker lỗi"));

// Lịch bảo trì định kỳ: dọn phiên hết hạn lúc 03:00 hằng ngày (giờ Việt Nam). upsert nên không tạo trùng khi khởi động lại.
const scheduler = new Queue(QUEUES.notifications, { connection });
await scheduler.upsertJobScheduler(
  MAINTENANCE_JOBS.purgeSessions,
  { pattern: "0 3 * * *", tz: "Asia/Ho_Chi_Minh" },
  {
    name: MAINTENANCE_JOBS.purgeSessions,
    opts: {
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
      removeOnComplete: 30,
      removeOnFail: 100,
    },
  },
);

log.info({ queue: QUEUES.notifications, concurrency: env.WORKER_CONCURRENCY }, "Worker đã sẵn sàng");

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, "Đang dừng worker, chờ job đang chạy hoàn tất");
  const timer = setTimeout(() => {
    log.error("Quá thời gian dừng, thoát cưỡng bức");
    process.exit(1);
  }, 30_000);
  try {
    await worker.close();
    await scheduler.close();
    await connection.quit();
    await handle.close();
    clearTimeout(timer);
    process.exit(0);
  } catch (err) {
    log.error({ err }, "Lỗi khi dừng worker");
    process.exit(1);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
