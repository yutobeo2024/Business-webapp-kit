// Áp dụng migration. Chạy được ở dev (`pnpm db:migrate`) và production (service `migrate` trong compose).
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./client.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Thiếu DATABASE_URL");
  process.exit(1);
}

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));
const handle = createDb(url, { max: 1, appName: "migrate" });

try {
  await migrate(handle.db, { migrationsFolder });
  console.warn(`[migrate] OK (${migrationsFolder})`);
} catch (err) {
  console.error("[migrate] FAIL", err);
  process.exitCode = 1;
} finally {
  await handle.close();
}
