import { z } from "zod";
import type { Turn } from "./conversation";

/**
 * Feedback after a conversation: four scores of 1–5 and three moments
 * quoting the person's own sentences. The model proposes it; this file
 * checks the shape, and a moment whose quote is not something the person
 * actually said is dropped, so every piece of feedback has its evidence.
 */

export const SCORE_KEYS = ["klarhed", "empati", "lytning", "fasthed"] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];

const score = z.coerce.number().int().min(1).max(5);

export const feedbackSchema = z.object({
  scores: z.object({ klarhed: score, empati: score, lytning: score, fasthed: score }),
  moments: z
    .array(
      z.object({
        kind: z.enum(["good", "try"]),
        quote: z.string().trim().min(1).max(400),
        why: z.string().trim().min(1).max(300),
      }),
    )
    .max(6),
});

export type Feedback = z.infer<typeof feedbackSchema>;

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”"«»„]/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Whether a quote is, word for word, part of something the person said. */
export function quoteIsTheirs(quote: string, history: Turn[]): boolean {
  const q = normalize(quote);
  if (q.length < 3) return false;
  return history.some((t) => t.who === "you" && normalize(t.text).includes(q));
}

/** Reads the model's answer: JSON, possibly in a code fence. Null when it is not usable. */
export function parseFeedback(raw: string, history: Turn[]): Feedback | null {
  const json = raw.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  const parsed = feedbackSchema.safeParse(data);
  if (!parsed.success) return null;
  const moments = parsed.data.moments
    .filter((m) => quoteIsTheirs(m.quote, history))
    .map((m) => ({ ...m, quote: m.quote.replace(/^[“”"«»„]+|[“”"«»„]+$/g, "") }))
    .slice(0, 3);
  return { scores: parsed.data.scores, moments };
}

/** Whether there is enough to give feedback on: at least two things the person said. */
export function enoughForFeedback(history: Turn[]): boolean {
  return history.filter((t) => t.who === "you" && t.text.trim().length > 0).length >= 2;
}
