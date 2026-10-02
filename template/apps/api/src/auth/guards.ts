import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { BusinessError, Errors } from "../common/business-error.js";
import type { AuthedRequest } from "../common/request-context.js";
import { ENV, type Env } from "../config/env.js";
import { AuthService } from "./auth.service.js";
import { IS_PUBLIC } from "./decorators.js";

export const SESSION_COOKIE = "sid";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Chống CSRF: request thay đổi dữ liệu phải có Origin (hoặc Referer) trùng APP_ORIGIN.
 * Kết hợp cookie SameSite=Lax. Client không phải trình duyệt phải gửi header Origin.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (SAFE_METHODS.has(req.method)) return true;
    const origin =
      req.get("origin") ?? (req.get("referer") ? new URL(req.get("referer")!).origin : undefined);
    if (origin === this.env.APP_ORIGIN) return true;
    throw new BusinessError("CSRF_REJECTED", "Yêu cầu không hợp lệ (nguồn gửi không được phép)", 403);
  }
}

/** Mặc định MỌI endpoint yêu cầu đăng nhập. Endpoint công khai phải gắn @Public(). */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== "string" || token.length < 20) throw Errors.unauthenticated();
    const result = await this.auth.validate(token);
    if (!result) throw Errors.unauthenticated();
    req.user = result.user;
    req.sessionTokenHash = result.tokenHash;
    return true;
  }
}
