import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { CurrentUser as CurrentUserType } from "@app/shared";
import { Errors } from "../common/business-error.js";
import type { AuthedRequest } from "../common/request-context.js";

export const IS_PUBLIC = "isPublic";
/** Đánh dấu endpoint không cần đăng nhập. Mặc định mọi endpoint đều yêu cầu đăng nhập. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): CurrentUserType => {
  const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  // Chỉ xảy ra khi dùng @CurrentUser() trên endpoint @Public(): coi như chưa đăng nhập.
  if (!user) throw Errors.unauthenticated();
  return user;
});
