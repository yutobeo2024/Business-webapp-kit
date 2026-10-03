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
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { PR_STATUSES, type PrItem } from "@app/shared";

// Quy ước: bảng snake_case số nhiều; mọi bảng nghiệp vụ có created_at, updated_at; xóa mềm bằng deleted_at.
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const prStatusEnum = pgEnum("pr_status", PR_STATUSES);

export const departments = pgTable("departments", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  /** Ngừng dùng thay vì xóa: người dùng và chứng từ cũ vẫn trỏ tới. Không gán người mới vào phòng ban ngừng dùng. */
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  ...timestamps,
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    /** Đang dùng mật khẩu tạm do quản trị viên đặt: phải đổi trước khi làm việc khác. */
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    departmentId: uuid("department_id").references(() => departments.id),
    isActive: boolean("is_active").notNull().default(true),
    failedLoginCount: integer("failed_login_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`),
    index("users_department_idx").on(t.departmentId),
  ],
);

/**
 * Vai trò = tập quyền do quản trị viên cấu hình (ADR-0004). Quyền là chuỗi khóa trong danh mục PERMISSIONS
 * (packages/shared/src/permissions.ts); quyền không còn trong danh mục bị bỏ qua khi nạp.
 */
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    /** Vai trò "Quản trị hệ thống": không xóa, không đổi tên, luôn giữ quyền quản trị người dùng và vai trò. */
    isSystem: boolean("is_system").notNull().default(false),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [uniqueIndex("roles_name_lower_uq").on(sql`lower(${t.name})`)],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permission] })],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** restrict: không xóa vai trò còn người dùng (service báo lỗi rõ trước khi tới đây). */
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] }), index("user_roles_role_idx").on(t.roleId)],
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
    /** VND, số nguyên. mode "number" an toàn tới 2^53; giới hạn MAX_VND và isValidVnd ở biên (@app/shared/money). */
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

/**
 * Tệp đính kèm và tệp xuất (spec 002). Nội dung nằm trong storage theo `storage_key` (do hệ thống sinh, không chứa tên gốc).
 * Gắn với bản ghi nghiệp vụ qua (entity_type, entity_id); quyền xem tệp = quyền xem bản ghi đó, do module kiểm.
 */
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storageKey: text("storage_key").notNull().unique(),
    /** Tên hiển thị đã làm sạch; chỉ dùng khi tải về, không bao giờ làm đường dẫn. */
    originalName: text("original_name").notNull(),
    /** Loại xác định theo NỘI DUNG tệp lúc tải lên. */
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Xóa mềm; job dọn dẹp xóa tệp vật lý sau 7 ngày. */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("files_entity_idx").on(t.entityType, t.entityId), index("files_deleted_idx").on(t.deletedAt)],
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
