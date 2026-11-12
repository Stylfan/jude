import { asc, eq } from "drizzle-orm";
import type { Tx } from "@/db/client";
import { auditLog, profiles, usageDays, users } from "@/db/schema";

/**
 * Everything an account holds, for the one-click export: the account, the
 * profile, the counted use per day and the audit trail of the profile.
 * There are no conversations to export, because none are stored. Runs
 * inside withUser(), so row-level security limits it to the account.
 */

export type AccountExport = {
  format: "jude-export";
  version: 1;
  exportedAt: string;
  account: { id: string; email: string; name: string; createdAt: number };
  profile: Record<string, unknown> | null;
  usage: Record<string, unknown>[];
  auditLog: Record<string, unknown>[];
};

export async function exportAccount(tx: Tx, userId: string): Promise<AccountExport> {
  const [account] = await tx
    .select({ id: users.id, email: users.email, name: users.name, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));
  if (!account) throw new Error("export: no such account");
  const [profile] = await tx.select().from(profiles).where(eq(profiles.userId, userId));
  const usage = await tx
    .select()
    .from(usageDays)
    .where(eq(usageDays.userId, userId))
    .orderBy(asc(usageDays.day));
  const audit = await tx
    .select()
    .from(auditLog)
    .where(eq(auditLog.ownerId, userId))
    .orderBy(asc(auditLog.at));
  return {
    format: "jude-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    account,
    profile: profile ?? null,
    usage,
    auditLog: audit,
  };
}
