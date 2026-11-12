import { createHash } from "node:crypto";
import { currentUser } from "@/auth/session";
import type { User } from "@/db/schema";
import { withUser } from "@/db/client";
import type { ProfileFacts } from "@/domain/prompts";
import { AiError, AiNotConfigured } from "@/services/mistral";
import { getProfile } from "@/services/profiles";

/**
 * What the conversation's route handlers share: who is asking, the key
 * that signs tickets, the person's facts from their profile, and answers
 * that never carry a stack trace. Errors are logged by kind only, never
 * with what was said, because an error may hold the words of a turn.
 */

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function apiUser(): Promise<User | null> {
  return currentUser();
}

/** The key for conversation tickets, derived from JUDE_SECRET so it is never the 2FA key itself. */
export function ticketSecret(): string {
  const secret = process.env.JUDE_SECRET;
  if (!secret || secret.length < 32) throw new Error("JUDE_SECRET is not set; see .env.example");
  return createHash("sha256").update(`jude-ticket:${secret}`).digest("base64url");
}

export async function profileFacts(userId: string): Promise<ProfileFacts | null> {
  const p = await withUser(userId, (tx) => getProfile(tx, userId));
  return p ? { firstName: p.firstName, age: p.age, improve: p.improve } : null;
}

/** Turns a failure into an answer the page can word, logging only its kind. */
export function failure(where: string, error: unknown): Response {
  if (error instanceof AiNotConfigured) return json({ error: "notConfigured" }, 503);
  if (error instanceof AiError) {
    console.error(`${where}: ${error.message}`);
    return json({ error: "ai" }, 502);
  }
  const kind = error instanceof Error ? error.name : "unknown";
  console.error(`${where}: failed (${kind})`);
  return json({ error: "generic" }, 500);
}
