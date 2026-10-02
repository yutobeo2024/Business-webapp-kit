import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

export type Db = NodePgDatabase<typeof schema>;
/** Transaction hoặc DB gốc. Hàm nhận `DbOrTx` chạy được cả trong và ngoài transaction. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;

export interface DbHandle {
  db: Db;
  pool: pg.Pool;
  close: () => Promise<void>;
}

export function createDb(
  connectionString: string,
  opts: { max?: number; appName?: string; statementTimeoutMs?: number } = {},
): DbHandle {
  const pool = new pg.Pool({
    connectionString,
    max: opts.max ?? 10,
    application_name: opts.appName ?? "app",
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // Chặn query treo: lỗi sau 30 giây thay vì giữ kết nối vô hạn. 0 = không giới hạn (chỉ dùng cho migrate).
    statement_timeout: opts.statementTimeoutMs ?? 30_000,
  });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { db, pool, close: () => pool.end() };
}
