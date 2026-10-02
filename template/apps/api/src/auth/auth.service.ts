import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { sessions, users, type Db } from "@app/db";
import type { CurrentUser, LoginInput } from "@app/shared";
import { writeAudit } from "../common/audit.js";
import { BusinessError, Errors } from "../common/business-error.js";
import { ENV, type Env } from "../config/env.js";
import { DB } from "../db/db.module.js";
import { getDummyHash, hashToken, newSessionToken, verifyPassword } from "./crypto.js";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
/** Gia hạn phiên trượt: chỉ ghi DB khi lần hoạt động trước cách quá mốc này, tránh ghi DB mỗi request. */
const TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: CurrentUser;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private ttlMs(): number {
    return this.env.SESSION_TTL_HOURS * 60 * 60 * 1000;
  }

  async login(
    input: LoginInput,
    meta: { ip: string | null; userAgent: string | null },
  ): Promise<LoginResult> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${input.email}`)
      .limit(1);

    const invalid = new BusinessError("AUTH_INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng", 401);

    if (!user) {
      await verifyPassword(await getDummyHash(), input.password);
      throw invalid;
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new BusinessError(
        "AUTH_LOCKED",
        `Tài khoản tạm khóa do đăng nhập sai nhiều lần. Thử lại sau ${LOCK_MINUTES} phút.`,
        423,
      );
    }
    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok || !user.isActive) {
      await this.recordFailedLogin(user.id, meta.ip);
      throw invalid;
    }

    const token = newSessionToken();
    const expiresAt = new Date(Date.now() + this.ttlMs());
    await this.db.transaction(async (tx) => {
      await tx.update(users).set({ failedLoginCount: 0, lockedUntil: null }).where(eq(users.id, user.id));
      await tx.insert(sessions).values({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 500) ?? null,
      });
      await writeAudit(tx, {
        actorId: user.id,
        action: "auth.login",
        entityType: "user",
        entityId: user.id,
        ip: meta.ip,
      });
    });

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId,
      },
    };
  }

  /**
   * Đếm lần đăng nhập sai trong transaction có khóa dòng: các request sai song song xếp hàng,
   * không thể cùng đọc một giá trị cũ rồi ghi đè nhau (lách giới hạn 5 lần).
   */
  private async recordFailedLogin(userId: string, ip: string | null): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ failed: users.failedLoginCount, lockedUntil: users.lockedUntil })
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
      // Request song song khác vừa khóa tài khoản: giữ nguyên khóa, không đếm lại từ đầu.
      if (!current || (current.lockedUntil && current.lockedUntil > new Date())) return;
      const failed = current.failed + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      await tx
        .update(users)
        .set({
          failedLoginCount: lock ? 0 : failed,
          lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
        })
        .where(eq(users.id, userId));
      await writeAudit(tx, {
        actorId: userId,
        action: lock ? "auth.locked" : "auth.login_failed",
        entityType: "user",
        entityId: userId,
        ip,
      });
    });
  }

  /** Trả về user nếu token hợp lệ, null nếu không. Tự gia hạn phiên trượt. */
  async validate(token: string): Promise<{ user: CurrentUser; tokenHash: string } | null> {
    const tokenHash = hashToken(token);
    const now = new Date();
    const [row] = await this.db
      .select({
        sessionId: sessions.id,
        lastSeenAt: sessions.lastSeenAt,
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        departmentId: users.departmentId,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now), eq(users.isActive, true)))
      .limit(1);
    if (!row) return null;

    if (now.getTime() - row.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      await this.db
        .update(sessions)
        .set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + this.ttlMs()) })
        .where(eq(sessions.id, row.sessionId));
    }
    const { sessionId: _s, lastSeenAt: _l, ...user } = row;
    return { user, tokenHash };
  }

  async logout(tokenHash: string, actorId: string, ip: string | null): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
      await writeAudit(tx, { actorId, action: "auth.logout", entityType: "user", entityId: actorId, ip });
    });
  }

  /** Dọn phiên hết hạn. Gọi định kỳ từ worker. */
  async purgeExpiredSessions(): Promise<number> {
    const res = await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
    return res.rowCount ?? 0;
  }

  assertAuthenticated(user: CurrentUser | undefined): CurrentUser {
    if (!user) throw Errors.unauthenticated();
    return user;
  }
}
