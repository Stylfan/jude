import { withUser } from "@/db/client";
import { historyChars, historySchema } from "@/domain/conversation";
import { checkTurn, readLimits } from "@/domain/limits";
import { scenarioSchema } from "@/domain/scenario";
import { openTicket, sealTicket } from "@/domain/ticket";
import { pickVoice, readVoices } from "@/domain/voices";
import { apiUser, failure, json, profileFacts, ticketSecret } from "@/lib/conversation-api";
import { takeTurn } from "@/services/conversation";
import { getAi } from "@/services/mistral";
import { charge } from "@/services/usage";

/**
 * One turn: what the person said (a WAV recording), the set-up and the
 * conversation so far in, the other person's answer out as text and, with
 * a voice, as speech. Checked against the ticket's clock and count, the
 * day's ceilings and the safety stop. Nothing is stored or logged.
 */

export const dynamic = "force-dynamic";

/** 16 kHz, 16-bit mono WAV: 32,000 bytes a second, plus its header. */
const BYTES_PER_SECOND = 32_000;

function parseJson(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const user = await apiUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  const limits = readLimits();
  const maxBytes = limits.secondsPerTurn * BYTES_PER_SECOND + 1024;
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes + 64_000) {
    return json({ error: "tooLong" }, 413);
  }

  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: "invalid" }, 400);
  const secret = ticketSecret();
  const ticket = openTicket(String(form.get("ticket") ?? ""), secret);
  if (!ticket || ticket.userId !== user.id) return json({ error: "invalid" }, 400);
  // A stopped conversation is never continued.
  if (ticket.stopped) return json({ error: "stopped" }, 409);
  const check = checkTurn(limits, ticket);
  if (check !== "ok") return json({ error: "limit", which: check }, 429);

  const scenario = scenarioSchema(limits.charsPerField).safeParse(parseJson(form.get("scenario")));
  const history = historySchema(limits.charsPerTurn, limits.turnsPerConversation).safeParse(
    parseJson(form.get("history")),
  );
  const audio = form.get("audio");
  if (!scenario.success || !history.success || !(audio instanceof Blob)) {
    return json({ error: "invalid" }, 400);
  }
  if (audio.size > maxBytes) return json({ error: "tooLong" }, 413);

  try {
    const counted = await withUser(user.id, (tx) =>
      charge(tx, limits, {
        turns: 1,
        chars: historyChars(history.data) + limits.charsPerTurn,
      }),
    );
    if (counted !== "ok") return json({ error: "limit", which: counted }, 429);

    const s = scenario.data;
    const result = await takeTurn(getAi(), {
      scenario: s,
      me: await profileFacts(user.id),
      history: history.data,
      audio: new Uint8Array(await audio.arrayBuffer()),
      voice: pickVoice(readVoices(), s.voice, s.gender, s.age),
      maxChars: limits.charsPerTurn,
    });

    if (result.kind === "stop") {
      return json({ kind: "stop", ticket: sealTicket({ ...ticket, stopped: true }, secret) });
    }
    if (result.kind === "empty") return json({ kind: "empty", ticket: sealTicket(ticket, secret) });
    return json({
      kind: "reply",
      ticket: sealTicket({ ...ticket, turns: ticket.turns + 1 }, secret),
      you: result.you,
      other: result.other,
      audio: result.audio ? Buffer.from(result.audio).toString("base64") : null,
    });
  } catch (error) {
    return failure("conversation turn", error);
  }
}
