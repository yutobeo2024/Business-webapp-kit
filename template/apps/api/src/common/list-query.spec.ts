import { describe, expect, it } from "vitest";
import { listPurchaseRequestsQuerySchema } from "@app/shared";
import { escapeLike } from "./list-query.js";

describe("escapeLike", () => {
  it("ký tự đại diện của LIKE được tìm như chữ thường", () => {
    expect(escapeLike(String.raw`50%_a\b`)).toBe(String.raw`50\%\_a\\b`);
  });
});

describe("listQuerySchema (qua danh sách phiếu)", () => {
  it("mặc định: trang 1, 20 dòng, mới nhất trước, không tìm", () =>
    expect(listPurchaseRequestsQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      sort: "createdAt",
      order: "desc",
    }));
  it("tham số từ URL (chuỗi) được chuyển kiểu; từ khóa rỗng coi như không tìm", () =>
    expect(listPurchaseRequestsQuerySchema.parse({ page: "2", q: "  ", sort: "code", order: "asc" })).toEqual(
      {
        page: 2,
        pageSize: 20,
        sort: "code",
        order: "asc",
      },
    ));
  it("cột sắp xếp ngoài danh sách cho phép bị từ chối (không bao giờ vào SQL)", () => {
    const r = listPurchaseRequestsQuerySchema.safeParse({ sort: "password_hash" });
    expect(r.success).toBe(false);
  });
});
