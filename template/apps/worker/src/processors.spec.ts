import { describe, expect, it } from "vitest";
import pino from "pino";
import { createProcessor } from "./processors.js";

describe("createProcessor", () => {
  const process = createProcessor({ db: {} as never, log: pino({ level: "silent" }) });

  it("báo lỗi với job không có processor, không bỏ qua im lặng", async () => {
    await expect(process({ name: "job.la", data: {} } as never)).rejects.toThrow(/Không có processor/);
  });

  it("xử lý job đổi trạng thái phiếu", async () => {
    await expect(
      process({
        id: "pr-1-v2",
        name: "pr.status_changed",
        data: {
          purchaseRequestId: "1",
          code: "PR-2026-000001",
          from: "DRAFT",
          to: "PENDING_MANAGER",
          actorId: "u",
          version: 2,
        },
      } as never),
    ).resolves.toBeUndefined();
  });
});
