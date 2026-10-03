import { describe, expect, it } from "vitest";
import { UnrecoverableError } from "bullmq";
import pino from "pino";
import { createProcessor } from "./processors.js";

describe("createProcessor", () => {
  const process = createProcessor({ db: {} as never, log: pino({ level: "silent" }) });

  it("báo lỗi với job không có processor, không bỏ qua im lặng", async () => {
    await expect(process({ name: "job.la", data: {} } as never)).rejects.toThrow(/Không có processor/);
  });

  it("job sai định dạng bị từ chối và không thử lại", async () => {
    const p = process({ id: "x", name: "pr.status_changed", data: { code: 1 } } as never);
    await expect(p).rejects.toBeInstanceOf(UnrecoverableError);
  });

  it("xử lý job đổi trạng thái phiếu", async () => {
    await expect(
      process({
        id: "pr-1-v2",
        name: "pr.status_changed",
        data: {
          purchaseRequestId: "8c5f0a52-6f1c-4b6e-9d0a-2f1f5a7f3c11",
          code: "PR-2026-000001",
          from: "DRAFT",
          to: "PENDING_MANAGER",
          actorId: "0b9d7c1e-3a4f-4e2b-8c6d-5e7f9a1b2c3d",
          version: 2,
        },
      } as never),
    ).resolves.toBeUndefined();
  });
});
