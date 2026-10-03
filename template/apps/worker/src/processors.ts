import { type Job, UnrecoverableError } from "bullmq";
import { lt } from "drizzle-orm";
import type { Logger } from "pino";
import { sessions, type Db } from "@app/db";
import { notify, planPrStatusNotification } from "@app/server";
import { JOBS, type PrStatusChangedJob, prStatusChangedJobSchema } from "@app/shared";

export const MAINTENANCE_JOBS = {
  purgeSessions: "maintenance.purge_sessions",
} as const;

export interface ProcessorDeps {
  db: Db;
  log: Logger;
}

/**
 * Phiếu đổi trạng thái: báo cho người liên quan (spec 001 mục 7). Idempotent: dedupeKey theo phiên bản phiếu, job chạy
 * lại không tạo thông báo thứ hai.
 */
async function onPrStatusChanged(
  jobId: string | undefined,
  data: PrStatusChangedJob,
  deps: ProcessorDeps,
): Promise<number> {
  const plan = await planPrStatusNotification(deps.db, data.purchaseRequestId, data.to);
  const created = plan
    ? await notify(deps.db, { ...plan, dedupeKey: `pr-${data.purchaseRequestId}-v${data.version}` })
    : [];
  deps.log.info(
    { jobId, pr: data.code, from: data.from, to: data.to, notified: created.length },
    "Phiếu đề nghị đổi trạng thái",
  );
  return created.length;
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
      case JOBS.prStatusChanged: {
        // Payload là input ở biên: API bản khác (lệch phiên bản lúc phát hành) hoặc job rác không được đi tiếp.
        const parsed = prStatusChangedJobSchema.safeParse(job.data);
        if (!parsed.success) {
          throw new UnrecoverableError(
            `Job ${job.name} sai định dạng: ${parsed.error.issues[0]?.message ?? ""}`,
          );
        }
        return onPrStatusChanged(job.id, parsed.data, deps);
      }
      case MAINTENANCE_JOBS.purgeSessions:
        return purgeSessions(deps);
      default:
        // Job lạ: báo lỗi để lộ ra trong log/giám sát, không im lặng bỏ qua.
        throw new Error(`Không có processor cho job "${job.name}"`);
    }
  };
}
