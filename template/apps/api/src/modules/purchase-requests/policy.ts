/**
 * Phạm vi dữ liệu theo vai trò (BR-07). Áp dụng ở tầng query để chống IDOR:
 * người không có quyền xem sẽ nhận 404 như thể phiếu không tồn tại.
 */
import type { CurrentUser } from "@app/shared";

export type ViewScope =
  | { kind: "all" }
  | { kind: "department"; departmentId: string; userId: string }
  | { kind: "own"; userId: string };

export function viewScope(actor: Pick<CurrentUser, "id" | "role" | "departmentId">): ViewScope {
  switch (actor.role) {
    case "DIRECTOR":
    case "ACCOUNTANT":
      return { kind: "all" };
    case "MANAGER":
      return actor.departmentId
        ? { kind: "department", departmentId: actor.departmentId, userId: actor.id }
        : { kind: "own", userId: actor.id };
    // ADMIN quản trị tài khoản, không tham gia nghiệp vụ (tách biệt nhiệm vụ): chỉ thấy phiếu của mình.
    case "ADMIN":
    case "STAFF":
      return { kind: "own", userId: actor.id };
  }
}

export function canView(scope: ViewScope, pr: { requesterId: string; departmentId: string }): boolean {
  switch (scope.kind) {
    case "all":
      return true;
    case "department":
      return pr.departmentId === scope.departmentId || pr.requesterId === scope.userId;
    case "own":
      return pr.requesterId === scope.userId;
  }
}
