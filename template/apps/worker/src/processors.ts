import type { Job } from "bullmq";
import { lt } from "drizzle-orm";
import type { Logger } from "pino";
import { sessions, type Db } from "@app/db";
import { JOBS, type PrStatusChangedJob } from "@app/shared";

export const MAINTENANCE_JOBS = {
  purgeSessions: "maintenance.purge_sessions",
} as const;

export interface ProcessorDeps {
  db: Db;
  log: Logger;
}

/**
 * Điểm mở rộng: gửi email / Zalo ZNS / thông báo trong app.
 * Processor phải idempotent: job có thể chạy lại khi retry. Dùng job.id làm khóa chống gửi trùng.
 */
async function onPrStatusChanged(job: Job<PrStatusChangedJob>, deps: ProcessorDeps): Promise<void> {
  deps.log.info(
    { jobId: job.id, pr: job.data.code, from: job.data.from, to: job.data.to },
    "Phiếu đề nghị đổi trạng thái",
  );
}

async function purgeSessions(deps: ProcessorDeps): Promise<number> {
  const res = await deps.db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  const n = res.rowCount ?? 0;
  deps.log.info({ deleted: n }, "Đã dọn phiên đăng nhập hết hạn");
  return n;
}

export function createProcessor(deps: ProcessorDeps) {
  return async (job: Job): Promise<unknown> => {
    switch (job.name) {
      case JOBS.prStatusChanged:
        return onPrStatusChanged(job as Job<PrStatusChangedJob>, deps);
      case MAINTENANCE_JOBS.purgeSessions:
        return purgeSessions(deps);
      default:
        // Job lạ: báo lỗi để lộ ra trong log/giám sát, không im lặng bỏ qua.
        throw new Error(`Không có processor cho job "${job.name}"`);
    }
  };
}
