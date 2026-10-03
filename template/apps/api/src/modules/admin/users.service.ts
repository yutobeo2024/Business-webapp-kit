import { Inject, Injectable } from "@nestjs/common";
import { and, count, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { departments, roles, sessions, userRoles, users, type Db, type DbOrTx } from "@app/db";
import {
  type CurrentUser,
  holderOnlyBeyond,
  type ListUsersQuery,
  type Paginated,
  type ResetPasswordInput,
  type SetUserActiveInput,
  type UserDto,
  type UserFormOptions,
  type createUserSchema,
  type updateUserSchema,
} from "@app/shared";
import type { z } from "zod";
import { hashPassword } from "../../auth/crypto.js";
import { writeAudit } from "../../common/audit.js";
import { BusinessError, Errors } from "../../common/business-error.js";
import { isUniqueViolation } from "../../common/db-errors.js";
import { orderBy, pageOffset, paginated, searchCondition } from "@app/server";
import { DB } from "../../db/db.module.js";
import {
  assertAdminRemains,
  assertNoEscalation,
  assertNotSelf,
  lockAdminInvariant,
  permissionsOfRoles,
  roleIdsOfUser,
} from "./safeguards.js";

type CreateUser = z.output<typeof createUserSchema>;
type UpdateUser = z.output<typeof updateUserSchema>;
type UserRow = typeof users.$inferSelect;

const ENTITY = "user";
const SORTABLE = {
  fullName: users.fullName,
  email: users.email,
  createdAt: users.createdAt,
} satisfies Record<ListUsersQuery["sort"], unknown>;

/** Trường an toàn để ghi audit: KHÔNG BAO GIỜ có passwordHash. */
const auditView = (u: UserRow, roleIds?: string[]) => ({
  email: u.email,
  fullName: u.fullName,
  phone: u.phone,
  departmentId: u.departmentId,
  isActive: u.isActive,
  mustChangePassword: u.mustChangePassword,
  ...(roleIds ? { roleIds } : {}),
});

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(q: ListUsersQuery): Promise<Paginated<UserDto>> {
    const now = new Date();
    const where = and(
      searchCondition(q.q, [users.fullName, users.email]),
      q.departmentId ? eq(users.departmentId, q.departmentId) : undefined,
      q.roleId
        ? inArray(
            users.id,
            this.db.select({ id: userRoles.userId }).from(userRoles).where(eq(userRoles.roleId, q.roleId)),
          )
        : undefined,
      q.status === "inactive" ? eq(users.isActive, false) : undefined,
      q.status === "locked" ? gt(users.lockedUntil, now) : undefined,
      q.status === "active"
        ? and(eq(users.isActive, true), or(isNull(users.lockedUntil), lte(users.lockedUntil, now)))
        : undefined,
    );
    const [rows, totals] = await Promise.all([
      this.db
        .select({ user: users, departmentName: departments.name })
        .from(users)
        .leftJoin(departments, eq(departments.id, users.departmentId))
        .where(where)
        .orderBy(...orderBy(q.sort, q.order, SORTABLE, users.id))
        .limit(q.pageSize)
        .offset(pageOffset(q)),
      this.db.select({ total: count() }).from(users).where(where),
    ]);
    const roleMap = await this.rolesByUser(
      this.db,
      rows.map((r) => r.user.id),
    );
    return paginated(
      rows.map((r) => toDto(r.user, r.departmentName, roleMap.get(r.user.id) ?? [])),
      totals[0]?.total ?? 0,
      q,
    );
  }

  async get(id: string, db: DbOrTx = this.db): Promise<UserDto> {
    const [row] = await db
      .select({ user: users, departmentName: departments.name })
      .from(users)
      .leftJoin(departments, eq(departments.id, users.departmentId))
      .where(eq(users.id, id));
    if (!row) throw Errors.notFound("USER");
    return toDto(row.user, row.departmentName, (await this.rolesByUser(db, [id])).get(id) ?? []);
  }

  /** Vai trò (kèm có được gán không, theo quy tắc chống leo thang) và phòng ban đang dùng, cho form người dùng. */
  async options(actor: CurrentUser): Promise<UserFormOptions> {
    const [roleRows, deptRows] = await Promise.all([
      this.db.select({ id: roles.id, name: roles.name }).from(roles).orderBy(roles.name),
      this.db
        .select({ id: departments.id, code: departments.code, name: departments.name })
        .from(departments)
        .where(eq(departments.isActive, true))
        .orderBy(departments.code),
    ]);
    const result: UserFormOptions = { roles: [], departments: deptRows };
    for (const r of roleRows) {
      const perms = await permissionsOfRoles(this.db, [r.id]);
      result.roles.push({ ...r, assignable: holderOnlyBeyond(actor.permissions, perms).length === 0 });
    }
    return result;
  }

  async create(actor: CurrentUser, input: CreateUser, ip: string | null): Promise<UserDto> {
    const passwordHash = await hashPassword(input.temporaryPassword);
    try {
      return await this.db.transaction(async (tx) => {
        await this.assertDepartmentUsable(tx, input.departmentId, null);
        await this.assertRolesExist(tx, input.roleIds);
        assertNoEscalation(actor, await permissionsOfRoles(tx, input.roleIds));
        const [created] = await tx
          .insert(users)
          .values({
            email: input.email,
            fullName: input.fullName,
            phone: input.phone ?? null,
            departmentId: input.departmentId,
            passwordHash,
            mustChangePassword: true,
          })
          .returning();
        await this.setRoles(tx, created!.id, input.roleIds);
        await writeAudit(tx, {
          actorId: actor.id,
          action: "user.create",
          entityType: ENTITY,
          entityId: created!.id,
          after: auditView(created!, input.roleIds),
          ip,
        });
        return this.get(created!.id, tx);
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new BusinessError("USER_EMAIL_TAKEN", `Email ${input.email} đã có tài khoản`, 409);
      }
      throw err;
    }
  }

  async update(actor: CurrentUser, id: string, input: UpdateUser, ip: string | null): Promise<UserDto> {
    return this.db.transaction(async (tx) => {
      await lockAdminInvariant(tx);
      const current = await this.lockTarget(tx, actor, id, input.version);
      const beforeRoles = await roleIdsOfUser(tx, id);
      const added = input.roleIds.filter((r) => !beforeRoles.includes(r));
      const removed = beforeRoles.filter((r) => !input.roleIds.includes(r));
      if (added.length || removed.length) {
        assertNotSelf(actor, id, "đổi vai trò");
        await this.assertRolesExist(tx, added);
        assertNoEscalation(actor, await permissionsOfRoles(tx, [...added, ...removed]));
      }
      // BR-A7: đổi phòng ban của mình là tự mở phạm vi xem/duyệt sang phòng khác.
      if (input.departmentId !== current.departmentId) assertNotSelf(actor, id, "đổi phòng ban");
      await this.assertDepartmentUsable(tx, input.departmentId, current.departmentId);
      const [updated] = await tx
        .update(users)
        .set({
          fullName: input.fullName,
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          departmentId: input.departmentId,
          version: current.version + 1,
        })
        .where(eq(users.id, id))
        .returning();
      await this.setRoles(tx, id, input.roleIds);
      await assertAdminRemains(tx);
      await writeAudit(tx, {
        actorId: actor.id,
        action: "user.update",
        entityType: ENTITY,
        entityId: id,
        before: auditView(current, beforeRoles),
        after: auditView(updated!, input.roleIds),
        ip,
      });
      return this.get(id, tx);
    });
  }

  /** Khóa / mở khóa tài khoản. Khóa thì thu hồi mọi phiên ngay (không chờ phiên hết hạn). */
  async setActive(
    actor: CurrentUser,
    id: string,
    input: SetUserActiveInput,
    ip: string | null,
  ): Promise<UserDto> {
    assertNotSelf(actor, id, input.isActive ? "mở khóa" : "khóa tài khoản");
    return this.db.transaction(async (tx) => {
      await lockAdminInvariant(tx);
      const current = await this.lockTarget(tx, actor, id, input.version);
      await tx
        .update(users)
        .set({ isActive: input.isActive, version: current.version + 1 })
        .where(eq(users.id, id));
      if (!input.isActive) await tx.delete(sessions).where(eq(sessions.userId, id));
      await assertAdminRemains(tx);
      await writeAudit(tx, {
        actorId: actor.id,
        action: input.isActive ? "user.activate" : "user.deactivate",
        entityType: ENTITY,
        entityId: id,
        ip,
      });
      return this.get(id, tx);
    });
  }

  /** Đặt mật khẩu tạm: bắt đổi ở lần đăng nhập sau, thu hồi mọi phiên, gỡ tạm khóa do đăng nhập sai. */
  async resetPassword(
    actor: CurrentUser,
    id: string,
    input: ResetPasswordInput,
    ip: string | null,
  ): Promise<UserDto> {
    assertNotSelf(actor, id, "đặt lại mật khẩu (hãy dùng Đổi mật khẩu)");
    const passwordHash = await hashPassword(input.temporaryPassword);
    return this.db.transaction(async (tx) => {
      const current = await this.lockTarget(tx, actor, id, input.version);
      await tx
        .update(users)
        .set({
          passwordHash,
          mustChangePassword: true,
          failedLoginCount: 0,
          lockedUntil: null,
          version: current.version + 1,
        })
        .where(eq(users.id, id));
      await tx.delete(sessions).where(eq(sessions.userId, id));
      await writeAudit(tx, {
        actorId: actor.id,
        action: "user.reset_password",
        entityType: ENTITY,
        entityId: id,
        ip,
      });
      return this.get(id, tx);
    });
  }

  /** Gỡ tạm khóa do đăng nhập sai nhiều lần (người dùng nhớ ra mật khẩu, không cần chờ hết thời gian khóa). */
  async unlock(actor: CurrentUser, id: string, ip: string | null): Promise<UserDto> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx.select().from(users).where(eq(users.id, id)).for("update");
      if (!current) throw Errors.notFound("USER");
      assertNoEscalation(actor, await permissionsOfRoles(tx, await roleIdsOfUser(tx, id)));
      await tx.update(users).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, id));
      await writeAudit(tx, {
        actorId: actor.id,
        action: "user.unlock",
        entityType: ENTITY,
        entityId: id,
        ip,
      });
      return this.get(id, tx);
    });
  }

  /**
   * Khóa dòng người dùng đích, kiểm phiên bản, và chặn thao tác trên tài khoản mang quyền quản trị mình chưa có
   * (không đặt lại mật khẩu, khóa, đổi vai trò của người mạnh hơn mình).
   */
  private async lockTarget(tx: DbOrTx, actor: CurrentUser, id: string, version: number): Promise<UserRow> {
    const [current] = await tx.select().from(users).where(eq(users.id, id)).for("update");
    if (!current) throw Errors.notFound("USER");
    assertNoEscalation(actor, await permissionsOfRoles(tx, await roleIdsOfUser(tx, id)));
    if (current.version !== version) throw Errors.versionConflict();
    return current;
  }

  /** Phòng ban phải tồn tại và đang dùng; giữ nguyên phòng ban cũ (dù đã ngừng dùng) thì vẫn được. */
  private async assertDepartmentUsable(tx: DbOrTx, departmentId: string | null, currentId: string | null) {
    if (!departmentId || departmentId === currentId) return;
    const [d] = await tx.select().from(departments).where(eq(departments.id, departmentId));
    if (!d) throw Errors.notFound("DEPARTMENT");
    if (!d.isActive) {
      throw new BusinessError(
        "DEPARTMENT_INACTIVE",
        `Phòng ban ${d.name} đã ngừng dùng, không gán người mới vào`,
        422,
      );
    }
  }

  private async assertRolesExist(tx: DbOrTx, roleIds: string[]) {
    if (!roleIds.length) return;
    const found = await tx.select({ id: roles.id }).from(roles).where(inArray(roles.id, roleIds));
    if (found.length !== roleIds.length) throw Errors.notFound("ROLE");
  }

  private async setRoles(tx: DbOrTx, userId: string, roleIds: string[]) {
    await tx.delete(userRoles).where(eq(userRoles.userId, userId));
    if (roleIds.length) await tx.insert(userRoles).values(roleIds.map((roleId) => ({ userId, roleId })));
  }

  private async rolesByUser(db: DbOrTx, userIds: string[]) {
    const map = new Map<string, { id: string; name: string }[]>();
    if (!userIds.length) return map;
    const rows = await db
      .select({ userId: userRoles.userId, id: roles.id, name: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(inArray(userRoles.userId, userIds))
      .orderBy(roles.name);
    for (const r of rows) map.set(r.userId, [...(map.get(r.userId) ?? []), { id: r.id, name: r.name }]);
    return map;
  }
}

function toDto(u: UserRow, departmentName: string | null, roleList: { id: string; name: string }[]): UserDto {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    departmentId: u.departmentId,
    departmentName,
    roles: roleList,
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword,
    lockedUntil: u.lockedUntil && u.lockedUntil > new Date() ? u.lockedUntil.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
    version: u.version,
  };
}
