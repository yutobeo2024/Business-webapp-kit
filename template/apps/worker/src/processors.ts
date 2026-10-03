import { type Job, UnrecoverableError } from "bullmq";
import { lt } from "drizzle-orm";
import type { Logger } from "pino";
import { sessions, type Db } from "@app/db";
import { notify, planPrStatusNotification } from "@app/server";
import {
  JOBS,
  type NotificationChannel,
  notificationDeliverJobSchema,
  type PrStatusChangedJob,
  prStatusChangedJobSchema,
} from "@app/shared";
import type { NotificationSender } from "./notifications/channel.js";
import { deliver, sweepDeliveries } from "./notifications/deliver.js";
import type { ZaloZnsSender } from "./notifications/zalo.js";

export const MAINTENANCE_JOBS = {
  purgeSessions: "maintenance.purge_sessions",
  sweepDeliveries: "maintenance.sweep_deliveries",
  refreshZaloToken: "maintenance.refresh_zalo_token",
} as const;

export interface ProcessorDeps {
  db: Db;
  log: Logger;
  /** Kênh ngoài đang cấu hình (có sender). Trống: chỉ thông báo trong app. */
  senders?: Partial<Record<NotificationChannel, NotificationSender>>;
  /** Đẩy job gửi cho các lần giao (gọi SAU commit). `retry`: lượt quét lại, cần jobId mới. */
  enqueueDeliveries?: (deliveryIds: string[], opts?: { retry?: boolean }) => Promise<void>;
  /** Có khi bật Zalo: job làm mới token hằng ngày. */
  zalo?: Pick<ZaloZnsSender, "accessToken"> | null;
}

/**
 * Phiếu đổi trạng thái: báo cho người liên quan (spec 001 mục 7). Idempotent: dedupeKey theo phiên bản phiếu, job chạy
 * lại không tạo thông báo hay lần giao thứ hai.
 */
async function onPrStatusChanged(
  jobId: string | undefined,
  data: PrStatusChangedJob,
  deps: ProcessorDeps,
): Promise<number> {
  const plan = await planPrStatusNotification(deps.db, data.purchaseRequestId, data.to);
  const result = plan
    ? await notify(
        deps.db,
        { ...plan, dedupeKey: `pr-${data.purchaseRequestId}-v${data.version}` },
        { channels: Object.keys(deps.senders ?? {}) as NotificationChannel[] },
      )
    : { notificationIds: [], pendingDeliveryIds: [] };
  // Đẩy job lỗi thì lần giao vẫn PENDING, lượt quét 10 phút sẽ đẩy lại.
  if (result.pendingDeliveryIds.length) {
    await deps
      .enqueueDeliveries?.(result.pendingDeliveryIds)
      .catch((err: unknown) => deps.log.error({ err, jobId }, "Không đẩy được job gửi thông báo"));
  }
  deps.log.info(
    { jobId, pr: data.code, from: data.from, to: data.to, notified: result.notificationIds.length },
    "Phiếu đề nghị đổi trạng thái",
  );
  return result.notificationIds.length;
}

async function purgeSessions(deps: ProcessorDeps): Promise<number> {
  const res = await deps.db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  const n = res.rowCount ?? 0;
  deps.log.info({ deleted: n }, "Đã dọn phiên đăng nhập hết hạn");
  return n;
}

/** Payload job là input ở biên: API bản khác (lệch phiên bản lúc phát hành) hoặc job rác không được đi tiếp. */
function parseJob<T>(
  job: Job,
  schema: {
    safeParse(
      v: unknown,
    ): { success: true; data: T } | { success: false; error: { issues: { message: string }[] } };
  },
): T {
  const parsed = schema.safeParse(job.data);
  if (!parsed.success) {
    throw new UnrecoverableError(`Job ${job.name} sai định dạng: ${parsed.error.issues[0]?.message ?? ""}`);
  }
  return parsed.data;
}

export function createProcessor(deps: ProcessorDeps) {
  return async (job: Job): Promise<unknown> => {
    switch (job.name) {
      case JOBS.prStatusChanged:
        return onPrStatusChanged(job.id, parseJob(job, prStatusChangedJobSchema), deps);
      case JOBS.notificationDeliver: {
        const { deliveryId } = parseJob(job, notificationDeliverJobSchema);
        const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
        const outcome = await deliver(
          { db: deps.db, log: deps.log, senders: deps.senders ?? {} },
          deliveryId,
          { finalAttempt },
        );
        // Lỗi tạm thời: ném để BullMQ thử lại theo backoff.
        if (outcome === "retry") throw new Error(`Gửi thông báo ${deliveryId} lỗi tạm thời, sẽ thử lại`);
        return outcome;
      }
      case MAINTENANCE_JOBS.sweepDeliveries: {
        const ids = await sweepDeliveries(deps);
        if (ids.length) await deps.enqueueDeliveries?.(ids, { retry: true });
        return ids.length;
      }
      case MAINTENANCE_JOBS.refreshZaloToken:
        if (!deps.zalo) return "disabled";
        await deps.zalo.accessToken(true);
        deps.log.info("Đã làm mới token Zalo");
        return "refreshed";
      case MAINTENANCE_JOBS.purgeSessions:
        return purgeSessions(deps);
      default:
        // Job lạ: báo lỗi để lộ ra trong log/giám sát, không im lặng bỏ qua.
        throw new Error(`Không có processor cho job "${job.name}"`);
    }
  };
}
