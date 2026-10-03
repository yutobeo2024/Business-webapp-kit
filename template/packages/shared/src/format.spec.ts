import { describe, expect, it } from "vitest";
import { formatDateTime, formatVnd } from "./format.js";

describe("format", () => {
  it("định dạng tiền VND", () => expect(formatVnd(1_250_000).replace(/\s/g, " ")).toBe("1.250.000 ₫"));
  it("định dạng ngày giờ theo múi giờ Việt Nam", () =>
    expect(formatDateTime("2026-01-31T17:30:00.000Z")).toContain("01/02/2026"));
});
