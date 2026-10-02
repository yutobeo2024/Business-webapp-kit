import { describe, expect, it } from "vitest";
import { canView, viewScope } from "./policy.js";

const pr = { requesterId: "u1", departmentId: "kd" };

describe("BR-07 phạm vi xem dữ liệu", () => {
  it("nhân viên chỉ xem phiếu của mình", () => {
    expect(canView(viewScope({ id: "u1", role: "STAFF", departmentId: "kd" }), pr)).toBe(true);
    expect(canView(viewScope({ id: "u2", role: "STAFF", departmentId: "kd" }), pr)).toBe(false);
  });
  it("trưởng phòng xem phiếu cùng phòng ban", () => {
    expect(canView(viewScope({ id: "m1", role: "MANAGER", departmentId: "kd" }), pr)).toBe(true);
    expect(canView(viewScope({ id: "m2", role: "MANAGER", departmentId: "kt" }), pr)).toBe(false);
  });
  it("trưởng phòng chưa gán phòng ban chỉ xem phiếu của mình", () =>
    expect(viewScope({ id: "m3", role: "MANAGER", departmentId: null })).toEqual({
      kind: "own",
      userId: "m3",
    }));
  it("giám đốc và kế toán xem tất cả", () => {
    expect(canView(viewScope({ id: "d", role: "DIRECTOR", departmentId: null }), pr)).toBe(true);
    expect(canView(viewScope({ id: "k", role: "ACCOUNTANT", departmentId: null }), pr)).toBe(true);
  });
  it("admin không xem phiếu của người khác", () =>
    expect(canView(viewScope({ id: "a", role: "ADMIN", departmentId: null }), pr)).toBe(false));
});
