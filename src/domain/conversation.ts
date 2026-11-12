import { z } from "zod";

/**
 * What has been said so far, kept by the page and sent with each turn.
 * The server reads it for the length of one request and keeps nothing.
 */

export type Turn = { who: "you" | "other"; text: string };

export function historySchema(maxCharsPerTurn: number, maxTurns: number) {
  return z
    .array(
      z.object({
        who: z.enum(["you", "other"]),
        text: z.string().max(maxCharsPerTurn * 2),
      }),
    )
    .max(maxTurns * 2 + 2);
}

/** Characters of a history, for the usage counters. */
export function historyChars(history: Turn[]): number {
  return history.reduce((n, t) => n + t.text.length, 0);
}

/** Cuts a transcript to the ceiling at a word boundary. */
export function capTurn(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).trim();
}
