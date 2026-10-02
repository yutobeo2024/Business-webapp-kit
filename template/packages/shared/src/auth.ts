import { z } from "zod";
import { ROLES } from "./roles.js";

export const loginSchema = z.object({
  email: z
    .email("Email không hợp lệ")
    .max(200)
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const currentUserSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  fullName: z.string(),
  role: z.enum(ROLES),
  departmentId: z.uuid().nullable(),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;
