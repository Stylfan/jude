import { randomUUID } from "node:crypto";
import { withUser } from "@/db/client";
import { readLimits } from "@/domain/limits";
import { scenarioSchema } from "@/domain/scenario";
import { sealTicket } from "@/domain/ticket";
import { pickVoice, readVoices } from "@/domain/voices";
import { apiUser, failure, json, ticketSecret } from "@/lib/conversation-api";
import { aiAvailable } from "@/services/mistral";
import { getProfile, hasConsented } from "@/services/profiles";
import { charge } from "@/services/usage";

/**
 * Starting a conversation: checks the set-up, counts one conversation
 * against the ceilings and hands out the signed ticket. The set-up itself
 * is not stored; the page keeps it and sends it with every turn.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await apiUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  if (!aiAvailable()) return json({ error: "notConfigured" }, 503);
  const limits = readLimits();
  const parsed = scenarioSchema(limits.charsPerField).safeParse(
    ((await request.json().catch(() => null)) as { scenario?: unknown } | null)?.scenario,
  );
  if (!parsed.success) return json({ error: "invalid" }, 400);
  try {
    // Nothing goes to Mistral before the person has said yes to it.
    const result = await withUser(user.id, async (tx) =>
      hasConsented(await getProfile(tx, user.id))
        ? charge(tx, limits, { conversations: 1 })
        : "consent",
    );
    if (result === "consent") return json({ error: "consent" }, 403);
    if (result !== "ok") return json({ error: "limit", which: result }, 429);
    const s = parsed.data;
    const voice = pickVoice(readVoices(), s.voice, s.gender, s.age);
    const ticket = sealTicket(
      { id: randomUUID(), userId: user.id, startedAt: Date.now(), turns: 0, stopped: false },
      ticketSecret(),
    );
    return json({ ticket, minutes: limits.minutesPerConversation, voice: voice?.id ?? null });
  } catch (error) {
    return failure("conversation start", error);
  }
}
