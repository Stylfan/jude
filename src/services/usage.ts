import { sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { usageDay, type Limits } from "@/domain/limits";

/**
 * Counting against the cost ceilings, through the database function
 * charge_usage(), which checks the account's and the server's ceilings for
 * the day and counts only when both hold. Must run inside withUser().
 */

export type Charge = { conversations?: number; turns?: number; chars?: number };
export type ChargeResult = "ok" | "account" | "server";

export async function charge(
  db: Db,
  limits: Limits,
  amount: Charge,
  now: number = Date.now(),
): Promise<ChargeResult> {
  const result = await db.execute<{ result: string }>(sql`
    select charge_usage(
      ${usageDay(now)},
      ${amount.conversations ?? 0}::int, ${amount.turns ?? 0}::int, ${amount.chars ?? 0}::int,
      ${limits.account.conversations}::int, ${limits.account.turns}::int, ${limits.account.chars}::int,
      ${limits.server.conversations}::int, ${limits.server.turns}::int, ${limits.server.chars}::int
    ) as result`);
  const value = result.rows[0]?.result;
  return value === "account" || value === "server" ? value : "ok";
}
