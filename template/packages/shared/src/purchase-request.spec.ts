import { describe, expect, it } from "vitest";
import {
  calcTotal,
  createPurchaseRequestSchema,
  transitionPurchaseRequestSchema,
} from "./purchase-request.js";

describe("createPurchaseRequestSchema", () => {
  it("chấp nhận phiếu hợp lệ", () => {
    const r = createPurchaseRequestSchema.safeParse({
      title: "Mua máy in phòng kế toán",
      items: [{ name: "Máy in", quantity: 1, unitPrice: 5_000_000 }],
    });
    expect(r.success).toBe(true);
  });

  it("từ chối số tiền lẻ (không phải số nguyên VND)", () => {
    const r = createPurchaseRequestSchema.safeParse({
      title: "Mua máy in",
      items: [{ name: "Máy in", quantity: 1, unitPrice: 1000.5 }],
    });
    expect(r.success).toBe(false);
  });

  it("từ chối phiếu không có dòng hàng", () => {
    expect(createPurchaseRequestSchema.safeParse({ title: "Mua máy in", items: [] }).success).toBe(false);
  });
});

describe("transitionPurchaseRequestSchema", () => {
  it("BR-04: từ chối bắt buộc có lý do tối thiểu 10 ký tự", () => {
    expect(transitionPurchaseRequestSchema.safeParse({ event: "REJECT", version: 1 }).success).toBe(false);
    expect(
      transitionPurchaseRequestSchema.safeParse({ event: "REJECT", version: 1, reason: "Thiếu báo giá" })
        .success,
    ).toBe(true);
  });
});

describe("calcTotal", () => {
  it("cộng đúng thành tiền", () => {
    expect(
      calcTotal([
        { name: "A", quantity: 2, unitPrice: 1_500_000 },
        { name: "B", quantity: 3, unitPrice: 200_000 },
      ]),
    ).toBe(3_600_000);
  });
});
