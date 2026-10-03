import { describe, expect, it } from "vitest";
import { can, isPermission, PERMISSION_KEYS, permissionGroups, PERMISSIONS } from "./permissions.js";

describe("danh mục quyền", () => {
  it("can() chỉ đúng khi người dùng có đúng quyền đó", () => {
    expect(can({ permissions: ["pr.create"] }, "pr.create")).toBe(true);
    expect(can({ permissions: ["pr.create"] }, "pr.view.all")).toBe(false);
    expect(can(null, "pr.create")).toBe(false);
  });

  it("isPermission nhận đúng khóa trong danh mục, không nhận khóa lạ hay thuộc tính của Object", () => {
    expect(isPermission("users.manage")).toBe(true);
    expect(isPermission("module_da_go.x")).toBe(false);
    expect(isPermission("toString")).toBe(false);
  });

  it("mọi quyền có nhãn tiếng Việt và nằm trong đúng một nhóm", () => {
    const grouped = permissionGroups().flatMap((g) => g.items.map((i) => i.key));
    expect(grouped.sort()).toEqual([...PERMISSION_KEYS].sort());
    for (const key of PERMISSION_KEYS) expect(PERMISSIONS[key].label.length).toBeGreaterThan(5);
  });
});
