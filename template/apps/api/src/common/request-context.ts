import type { Request } from "express";
import type { CurrentUser } from "@app/shared";

export interface AuthedRequest extends Request {
  user?: CurrentUser;
  sessionTokenHash?: string;
}

export function clientIp(req: Request): string | null {
  return req.ip ?? null;
}
