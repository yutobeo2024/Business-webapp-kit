import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { PR_STATUSES, ROLES, type PrItem } from "@app/shared";

// Quy ước: bảng snake_case số nhiều; mọi bảng nghiệp vụ có created_at, updated_at; xóa mềm bằng deleted_at.
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const roleEnum = pgEnum("role", ROLES);
export const prStatusEnum = pgEnum("pr_status", PR_STATUSES);

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  ...timestamps,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("STAFF"),
    departmentId: uuid("department_id").references(() => departments.id),
    isActive: boolean("is_active").notNull().default(true),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`),
    index("users_department_idx").on(t.departmentId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** SHA-256 của token. Token gốc chỉ nằm trong cookie của người dùng, không lưu DB. */
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    ip: inet("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const prCodeSeq = pgSequence("pr_code_seq", { startWith: 1, increment: 1 });

export const purchaseRequests = pgTable(
  "purchase_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    title: text("title").notNull(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id),
    status: prStatusEnum("status").notNull().default("DRAFT"),
    /** VND, số nguyên. mode "number" an toàn tới 2^53, đủ cho nghiệp vụ; validate Number.isSafeInteger ở biên. */
    totalAmount: bigint("total_amount", { mode: "number" }).notNull(),
    items: jsonb("items").$type<PrItem[]>().notNull(),
    note: text("note"),
    rejectReason: text("reject_reason"),
    /** Optimistic lock (BR-06). Tăng 1 mỗi lần ghi. */
    version: integer("version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("purchase_requests_department_idx").on(t.departmentId),
    index("purchase_requests_requester_idx").on(t.requesterId),
    index("purchase_requests_status_idx").on(t.status),
    index("purchase_requests_created_idx").on(t.createdAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: inet("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_entity_idx").on(t.entityType, t.entityId),
    index("audit_logs_actor_idx").on(t.actorId),
    index("audit_logs_created_idx").on(t.createdAt),
  ],
);
