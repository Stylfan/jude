import { withUser } from "@/db/client";
import { historyChars, historySchema } from "@/domain/conversation";
import { readLimits } from "@/domain/limits";
import { scenarioSchema } from "@/domain/scenario";
import { openTicket } from "@/domain/ticket";
import { apiUser, failure, json, profileFacts, ticketSecret } from "@/lib/conversation-api";
import { giveFeedback } from "@/services/conversation";
import { getAi } from "@/services/mistral";
import { charge } from "@/services/usage";

/**
 * Feedback on a finished conversation: four scores and three moments in
 * the person's own words. Returned to the page and forgotten here; the
 * page offers it as a PDF and says it is not saved.
 */

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await apiUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  const limits = readLimits();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const ticket = openTicket(String(body?.ticket ?? ""), ticketSecret());
  if (!ticket || ticket.userId !== user.id) return json({ error: "invalid" }, 400);
  // After a safety stop there is no feedback: the conversation simply ends.
  if (ticket.stopped) return json({ error: "stopped" }, 409);

  const scenario = scenarioSchema(limits.charsPerField).safeParse(body?.scenario);
  const history = historySchema(limits.charsPerTurn, limits.turnsPerConversation).safeParse(
    body?.history,
  );
  if (!scenario.success || !history.success) return json({ error: "invalid" }, 400);

  try {
    const counted = await withUser(user.id, (tx) =>
      charge(tx, limits, { chars: historyChars(history.data) + 3_000 }),
    );
    if (counted !== "ok") return json({ error: "limit", which: counted }, 429);
    const result = await giveFeedback(getAi(), {
      scenario: scenario.data,
      me: await profileFacts(user.id),
      history: history.data,
    });
    if (result.kind === "tooShort") return json({ kind: "tooShort" });
    return json({ kind: "feedback", feedback: result.feedback });
  } catch (error) {
    return failure("conversation feedback", error);
  }
}
