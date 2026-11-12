/**
 * The cost ceilings, so a public demo cannot run up the bill. Every number
 * can be set in the environment; the defaults suit a small demo. Counted
 * per account per day (a demo visit is an account) and for the whole
 * server per day, by charge_usage() in the database.
 */

export type Limits = {
  /** Minutes one conversation may last. */
  minutesPerConversation: number;
  /** What the person says, turns per conversation. */
  turnsPerConversation: number;
  /** Characters in one free-text field of the set-up or profile. */
  charsPerField: number;
  /** Characters of one transcribed turn kept; the rest is cut. */
  charsPerTurn: number;
  /** Seconds of audio in one turn. */
  secondsPerTurn: number;
  account: { conversations: number; turns: number; chars: number };
  server: { conversations: number; turns: number; chars: number };
};

export const DEFAULT_LIMITS: Limits = {
  minutesPerConversation: 15,
  turnsPerConversation: 40,
  charsPerField: 500,
  charsPerTurn: 1200,
  secondsPerTurn: 60,
  account: { conversations: 3, turns: 120, chars: 120_000 },
  server: { conversations: 300, turns: 6_000, chars: 4_000_000 },
};

function positive(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return raw !== undefined && raw.trim() !== "" && Number.isInteger(n) && n > 0 ? n : fallback;
}

export function readLimits(env: Record<string, string | undefined> = process.env): Limits {
  const d = DEFAULT_LIMITS;
  return {
    minutesPerConversation: positive(env.JUDE_MINUTES_PER_CONVERSATION, d.minutesPerConversation),
    turnsPerConversation: positive(env.JUDE_TURNS_PER_CONVERSATION, d.turnsPerConversation),
    charsPerField: positive(env.JUDE_CHARS_PER_FIELD, d.charsPerField),
    charsPerTurn: positive(env.JUDE_CHARS_PER_TURN, d.charsPerTurn),
    secondsPerTurn: positive(env.JUDE_SECONDS_PER_TURN, d.secondsPerTurn),
    account: {
      conversations: positive(env.JUDE_ACCOUNT_CONVERSATIONS_PER_DAY, d.account.conversations),
      turns: positive(env.JUDE_ACCOUNT_TURNS_PER_DAY, d.account.turns),
      chars: positive(env.JUDE_ACCOUNT_CHARS_PER_DAY, d.account.chars),
    },
    server: {
      conversations: positive(env.JUDE_SERVER_CONVERSATIONS_PER_DAY, d.server.conversations),
      turns: positive(env.JUDE_SERVER_TURNS_PER_DAY, d.server.turns),
      chars: positive(env.JUDE_SERVER_CHARS_PER_DAY, d.server.chars),
    },
  };
}

/** The day the counters belong to, in Copenhagen: "2026-11-12". */
export function usageDay(now: number = Date.now()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(now);
}

export type TurnCheck = "ok" | "time" | "turns";

/**
 * Whether one more turn fits in the conversation. The start time and the
 * count come from a signed token (src/domain/ticket.ts), not from the page.
 */
export function checkTurn(
  limits: Limits,
  conversation: { startedAt: number; turns: number },
  now: number = Date.now(),
): TurnCheck {
  if (now - conversation.startedAt > limits.minutesPerConversation * 60_000) return "time";
  if (conversation.turns >= limits.turnsPerConversation) return "turns";
  return "ok";
}

/** Whole minutes used, for "4 af 15 minutter"; never more than the ceiling. */
export function minutesUsed(limits: Limits, startedAt: number, now: number = Date.now()): number {
  return Math.min(limits.minutesPerConversation, Math.floor((now - startedAt) / 60_000));
}
