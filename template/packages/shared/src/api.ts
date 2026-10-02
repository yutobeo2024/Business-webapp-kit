import { z } from "zod";

/** Định dạng lỗi thống nhất mà API trả về. `message` là tiếng Việt, hiển thị được cho người dùng. */
export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
