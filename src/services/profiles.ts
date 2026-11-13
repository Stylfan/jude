import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { profiles, type Profile } from "@/db/schema";
import { firstName, freeText } from "@/domain/scenario";

/**
 * The profile: the only thing Jude stores that a person typed, and only
 * about themselves. Runs inside withUser(), so row-level security limits
 * it to the acting account.
 */

export function profileSchema(maxChars: number) {
  return z.object({
    firstName: firstName.or(z.literal("")).default(""),
    age: z.coerce.number().int().min(10).max(110).nullable().default(null),
    roles: z
      .array(
        z.object({
          label: freeText(40).pipe(z.string().min(1)),
          kind: z.enum(["work", "private"]),
        }),
      )
      .max(12)
      .default([]),
    improve: freeText(maxChars).default(""),
  });
}

export type ProfileInput = z.infer<ReturnType<typeof profileSchema>>;

export async function getProfile(db: Db, userId: string): Promise<Profile | null> {
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  return row ?? null;
}

export async function saveProfile(db: Db, userId: string, input: ProfileInput): Promise<void> {
  // Two roles with the same name are one role.
  const seen = new Set<string>();
  const roles = input.roles.filter((r) => {
    const key = r.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const values = { ...input, roles };
  await db
    .insert(profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });
}

/**
 * The yes before the first conversation: what is said goes to Mistral, and
 * sensitive matters are best left out. Kept as a time only.
 */
export async function giveConsent(db: Db, userId: string, now = Date.now()): Promise<void> {
  // The first conversation can come before any profile: the yes starts an empty one.
  await db
    .insert(profiles)
    .values({ userId, consentedAt: now })
    .onConflictDoUpdate({ target: profiles.userId, set: { consentedAt: now } });
}

export function hasConsented(profile: Profile | null): boolean {
  return profile?.consentedAt != null;
}
