import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { withUser } from "@/db/client";
import { profiles } from "@/db/schema";
import { DEFAULT_LIMITS, type Limits } from "@/domain/limits";
import { exportAccount } from "@/services/export";
import { getProfile, giveConsent, hasConsented, saveProfile } from "@/services/profiles";
import { charge } from "@/services/usage";
import { deleteAccount } from "@/services/users";
import { appDb, failure, freshDb, ownerDb } from "./db";
import { seedUser } from "./helpers";

/**
 * The database's own guarantees, tested as the application role: one
 * account never reaches another's profile or usage, the audit log cannot
 * be rewritten, the ceilings hold, and deleting an account leaves nothing.
 * The meta-test fails any table that holds a person's data without
 * forced row-level security.
 */

let anne: string;
let bo: string;
const profile = {
  firstName: "Anne",
  age: 44,
  roles: [{ label: "Leder", kind: "work" as const }],
  improve: "",
};

beforeEach(async () => {
  const db = await freshDb();
  anne = await seedUser(db, "anne@example.dk");
  bo = await seedUser(db, "bo@example.dk");
});

const as = <T>(user: string, fn: Parameters<typeof withUser<T>>[1]) => withUser(user, fn, appDb());

describe("profiles", () => {
  it("keep the yes before the first conversation, also when the profile changes", async () => {
    await as(anne, (tx) => saveProfile(tx, anne, profile));
    expect(hasConsented(await as(anne, (tx) => getProfile(tx, anne)))).toBe(false);
    await as(anne, (tx) => giveConsent(tx, anne, 1_000));
    await as(anne, (tx) => saveProfile(tx, anne, { ...profile, improve: "At lytte" }));
    expect((await as(anne, (tx) => getProfile(tx, anne)))?.consentedAt).toBe(1_000);
    // Bo cannot say yes on Anne's behalf: her row is not his to change.
    await expect(as(bo, (tx) => giveConsent(tx, anne))).rejects.toThrow();
    expect((await as(anne, (tx) => getProfile(tx, anne)))?.consentedAt).toBe(1_000);
  });

  it("start empty with the yes, when the first conversation comes before a profile", async () => {
    await as(bo, (tx) => giveConsent(tx, bo, 2_000));
    const row = await as(bo, (tx) => getProfile(tx, bo));
    expect(row?.consentedAt).toBe(2_000);
    expect(row?.firstName).toBe("");
  });

  it("are seen and changed only by their own account", async () => {
    await as(anne, (tx) => saveProfile(tx, anne, profile));
    expect((await as(anne, (tx) => getProfile(tx, anne)))?.firstName).toBe("Anne");
    expect(await as(bo, (tx) => getProfile(tx, anne))).toBeNull();
    expect(await as(bo, (tx) => tx.select().from(profiles))).toEqual([]);
    expect(
      await failure(as(bo, (tx) => saveProfile(tx, anne, { ...profile, firstName: "Bo" }))),
    ).toMatch(/row-level security/);
  });

  it("leave an audit trail nobody can rewrite", async () => {
    await as(anne, (tx) => saveProfile(tx, anne, profile));
    await as(anne, (tx) => saveProfile(tx, anne, { ...profile, improve: "at lytte" }));
    const rows = await ownerDb().execute(
      sql`select operation from audit_log where owner_id = ${anne} order by id`,
    );
    expect(rows.rows.map((r) => (r as { operation: string }).operation)).toEqual([
      "insert",
      "update",
    ]);
    expect(await failure(ownerDb().execute(sql`delete from audit_log`))).toMatch(/append-only/);
    expect(await failure(ownerDb().execute(sql`update audit_log set operation = 'x'`))).toMatch(
      /append-only/,
    );
  });
});

describe("the cost ceilings", () => {
  const tight: Limits = {
    ...DEFAULT_LIMITS,
    account: { conversations: 2, turns: 10, chars: 1000 },
    server: { conversations: 3, turns: 100, chars: 100_000 },
  };
  const day = Date.UTC(2026, 10, 12, 12);

  it("count an account's conversations and refuse the one over its ceiling", async () => {
    expect(await as(anne, (tx) => charge(tx, tight, { conversations: 1 }, day))).toBe("ok");
    expect(await as(anne, (tx) => charge(tx, tight, { conversations: 1 }, day))).toBe("ok");
    expect(await as(anne, (tx) => charge(tx, tight, { conversations: 1 }, day))).toBe("account");
    // A new day, a new count.
    expect(await as(anne, (tx) => charge(tx, tight, { conversations: 1 }, day + 86_400_000))).toBe(
      "ok",
    );
  });

  it("hold the server's ceiling across accounts, even after an account is deleted", async () => {
    await as(anne, (tx) => charge(tx, tight, { conversations: 2 }, day));
    await as(anne, (tx) => deleteAccount(tx, anne));
    expect(await as(bo, (tx) => charge(tx, tight, { conversations: 1 }, day))).toBe("ok");
    expect(await as(bo, (tx) => charge(tx, tight, { conversations: 1 }, day))).toBe("server");
  });

  it("cannot be written around by the application", async () => {
    expect(
      await failure(as(anne, (tx) => tx.execute(sql`update usage_days set conversations = 0`))),
    ).toMatch(/permission denied/);
    expect(await failure(as(anne, (tx) => tx.execute(sql`delete from usage_server_days`)))).toMatch(
      /permission denied/,
    );
    expect(
      await failure(appDb().execute(sql`select charge_usage('2026-11-12',1,0,0,9,9,9,9,9,9)`)),
    ).toMatch(/nobody is signed in/);
  });
});

describe("leaving", () => {
  it("deletes the account, its profile, its usage and its audit trail, and only for itself", async () => {
    await as(anne, (tx) => saveProfile(tx, anne, profile));
    await as(anne, (tx) => charge(tx, DEFAULT_LIMITS, { conversations: 1 }));
    expect(await failure(as(bo, (tx) => deleteAccount(tx, anne)))).toMatch(
      /not the signed-in account/,
    );
    await as(anne, (tx) => deleteAccount(tx, anne));
    for (const q of [
      sql`select count(*)::int as n from users where id = ${anne}`,
      sql`select count(*)::int as n from profiles where user_id = ${anne}`,
      sql`select count(*)::int as n from usage_days where user_id = ${anne}`,
      sql`select count(*)::int as n from audit_log where owner_id = ${anne}`,
    ]) {
      expect(((await ownerDb().execute(q)).rows[0] as { n: number }).n).toBe(0);
    }
  });

  it("can take everything along first, and there are no conversations in it", async () => {
    await as(anne, (tx) => saveProfile(tx, anne, profile));
    const data = await as(anne, (tx) => exportAccount(tx, anne));
    expect(data.profile).toMatchObject({ firstName: "Anne" });
    expect(data.auditLog).toHaveLength(1);
    expect(Object.keys(data)).not.toContain("conversations");
  });
});

describe("every table", () => {
  it("that holds a person's data has forced row-level security", async () => {
    const outside = [
      "users",
      "sessions",
      "passkeys",
      "recovery_codes",
      "auth_challenges",
      "__drizzle_migrations",
    ];
    const rows = await ownerDb().execute(sql`
      select c.relname as name, c.relrowsecurity as rls, c.relforcerowsecurity as forced
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'`);
    const tables = rows.rows as { name: string; rls: boolean; forced: boolean }[];
    const unguarded = tables.filter((t) => !outside.includes(t.name) && !(t.rls && t.forced));
    expect(unguarded.map((t) => t.name)).toEqual([]);
    expect(tables.map((t) => t.name)).toEqual(expect.arrayContaining(["profiles", "usage_days"]));
  });
});
