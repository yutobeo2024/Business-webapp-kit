import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
  type CustomDecorator,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { eq } from "drizzle-orm";
import { rolePermissions, roles, userRoles, type DbOrTx } from "@app/db";
import { can, isPermission, type Permission } from "@app/shared";
import { Errors } from "../common/business-error.js";
import type { AuthedRequest } from "../common/request-context.js";

export interface Access {
  roles: { id: string; name: string }[];
  permissions: Permission[];
}

/**
 * Vai trò và quyền hiện tại của một người dùng (đọc mỗi request: đổi vai trò có hiệu lực ngay, không cần đăng xuất).
 * Quyền trong DB không còn trong danh mục (module đã gỡ) bị bỏ qua.
 */
export async function loadAccess(db: DbOrTx, userId: string): Promise<Access> {
  const rows = await db
    .select({ roleId: roles.id, roleName: roles.name, permission: rolePermissions.permission })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  const roleMap = new Map<string, string>();
  const permissions = new Set<Permission>();
  for (const r of rows) {
    roleMap.set(r.roleId, r.roleName);
    if (r.permission && isPermission(r.permission)) permissions.add(r.permission);
  }
  return {
    roles: [...roleMap]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi")),
    permissions: [...permissions].sort(),
  };
}

const REQUIRED = "requiredPermissions";

/**
 * Endpoint yêu cầu MỌI quyền liệt kê. Gắn ở controller hoặc từng handler.
 * Quyền ở mức hành động trong một bản ghi (duyệt phiếu của phòng nào...) vẫn kiểm trong state machine/policy.
 */
export const RequirePermission = (...permissions: Permission[]): CustomDecorator =>
  SetMetadata(REQUIRED, permissions);

/** Chạy sau SessionGuard (đã có req.user). Thiếu quyền: 403. */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndMerge<Permission[]>(REQUIRED, [
      ctx.getClass(),
      ctx.getHandler(),
    ]);
    if (!required?.length) return true;
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user || !required.every((p) => can(user, p))) throw Errors.forbidden();
    return true;
  }
}
