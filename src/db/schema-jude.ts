import { bigint, index, integer, jsonb, pgTable, primaryKey, text } from "drizzle-orm/pg-core";
import { timestamps } from "./columns";
import { users } from "./schema-accounts";

/**
 * Jude's own data. Only what a person types about themselves is stored:
 * the profile. Nothing about a conversation is ever written here, neither
 * the set-up, the transcript, the audio nor the feedback (CLAUDE.md). The
 * usage counters hold numbers only, so the cost ceilings survive a restart.
 */

/** A role the person has in their life: "Leder", "Far", "Storebror". */
export type ProfileRole = { label: string; kind: "work" | "private" };

/** What a person tells Jude about themselves. One per account, deleted with it. */
export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** First name only. */
  firstName: text("first_name").notNull().default(""),
  age: integer("age"),
  roles: jsonb("roles").$type<ProfileRole[]>().notNull().default([]),
  /** What they want to get better at, e.g. "At holde fast uden at blive hård". */
  improve: text("improve").notNull().default(""),
  /**
   * When the person said yes to their conversations being sent to Mistral,
   * before the first one (GDPR article 9(2)(a)). Null until then.
   */
  consentedAt: bigint("consented_at", { mode: "number" }),
  ...timestamps,
});

export type Profile = typeof profiles.$inferSelect;

/**
 * Counted use per account per day, for the cost ceilings. Written only by
 * the database function charge_usage(), which checks the ceilings and
 * counts in one step.
 */
export const usageDays = pgTable(
  "usage_days",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The day in Copenhagen, "2026-11-12". */
    day: text("day").notNull(),
    conversations: integer("conversations").notNull().default(0),
    turns: integer("turns").notNull().default(0),
    /** Characters sent to the model and spoken back, together. */
    chars: integer("chars").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

/**
 * Counted use for the whole server per day. Not tied to an account, so
 * deleting demo visits does not open the ceiling again.
 */
export const usageServerDays = pgTable("usage_server_days", {
  day: text("day").primaryKey(),
  conversations: integer("conversations").notNull().default(0),
  turns: integer("turns").notNull().default(0),
  chars: integer("chars").notNull().default(0),
});

/** Row changes in the tables that hold a person's own data, written by triggers. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    at: bigint("at", { mode: "number" }).notNull(),
    actorUserId: text("actor_user_id"),
    tableName: text("table_name").notNull(),
    operation: text("operation").notNull(),
    rowId: text("row_id"),
    /** The account the row belongs to. */
    ownerId: text("owner_id"),
    before: jsonb("before"),
    after: jsonb("after"),
  },
  (t) => [index("audit_log_owner_idx").on(t.ownerId, t.at)],
);
