import { Circle } from "lucide-react";
import { describe, expect, it } from "vitest";
import { filterNav, type NavGroup } from "./nav";

const groups: NavGroup[] = [
  { label: "Tổng quan", items: [{ to: "/", label: "Trang chủ", icon: Circle }] },
  {
    label: "Nghiệp vụ",
    items: [
      {
        to: "/inbox",
        label: "Chờ tôi xử lý",
        icon: Circle,
        permission: ["departments.manage", "roles.manage"],
      },
    ],
  },
  {
    label: "Quản trị",
    items: [{ to: "/admin/users", label: "Người dùng", icon: Circle, permission: "users.manage" }],
  },
];
const labels = (gs: NavGroup[]) => gs.map((g) => `${g.label}: ${g.items.map((i) => i.label).join(", ")}`);

describe("filterNav", () => {
  it("mục không ghi quyền: ai đăng nhập cũng thấy; nhóm không còn mục nào thì bỏ", () =>
    expect(labels(filterNav(groups, { permissions: [] }))).toEqual(["Tổng quan: Trang chủ"]));
  it("mục ghi một quyền: chỉ người có đúng quyền đó thấy", () =>
    expect(labels(filterNav(groups, { permissions: ["users.manage"] }))).toEqual([
      "Tổng quan: Trang chủ",
      "Quản trị: Người dùng",
    ]));
  it("mục ghi danh sách quyền: có MỘT trong các quyền là thấy", () =>
    expect(labels(filterNav(groups, { permissions: ["roles.manage"] }))).toEqual([
      "Tổng quan: Trang chủ",
      "Nghiệp vụ: Chờ tôi xử lý",
    ]));
  it("chưa đăng nhập: chỉ còn mục không ghi quyền", () =>
    expect(labels(filterNav(groups, null))).toEqual(["Tổng quan: Trang chủ"]));
});
