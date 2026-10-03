import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { type CurrentUser as CurrentUserType, type LoginInput, loginSchema } from "@app/shared";
import { type AuthedRequest, clientIp } from "../common/request-context.js";
import { ZodPipe } from "../common/zod.pipe.js";
import { ENV, type Env } from "../config/env.js";
import { AuthService } from "./auth.service.js";
import { CurrentUser, Public } from "./decorators.js";
import { SESSION_COOKIE, sessionCookieOptions } from "./guards.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  @HttpCode(200)
  async login(
    @Body(new ZodPipe(loginSchema)) body: LoginInput,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CurrentUserType> {
    const result = await this.auth.login(body, {
      ip: clientIp(req),
      userAgent: req.get("user-agent") ?? null,
    });
    res.cookie(SESSION_COOKIE, result.token, sessionCookieOptions(this.env, result.expiresAt));
    return result.user;
  }

  @Post("logout")
  @HttpCode(204)
  async logout(
    @CurrentUser() user: CurrentUserType,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (req.sessionTokenHash) await this.auth.logout(req.sessionTokenHash, user.id, clientIp(req));
    res.clearCookie(SESSION_COOKIE, { path: "/" });
  }

  @Get("me")
  me(@CurrentUser() user: CurrentUserType): CurrentUserType {
    return user;
  }
}
