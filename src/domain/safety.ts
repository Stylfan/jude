/**
 * The safety stop. A conversation that points to suicidal thoughts,
 * self-harm or violence against someone ends calmly, the person is shown
 * where to get help (Livslinien and 112), and that conversation can never
 * be continued (CLAUDE.md). Three signals, any one is enough:
 *
 * 1. Mistral's moderation scores for what the person said.
 * 2. Plain Danish words and phrases, checked here, so the stop does not
 *    depend on a model alone.
 * 3. The role prompt tells the model to answer with STOP_MARKER when it
 *    senses real risk; the marker is never shown or spoken.
 *
 * The rule leans towards stopping: a false stop costs a rehearsal, a
 * missed one could cost far more.
 */

export const STOP_MARKER = "[[JUDE_STOP]]";

/** Category scores from the moderation endpoint, keyed as Mistral names them. */
export type ModerationScores = Record<string, number>;

/** Above this score in a crisis category, the conversation stops. */
export const MODERATION_THRESHOLD = 0.5;

const CRISIS_CATEGORIES = ["selfharm", "violence_and_threats"];

// Lower-case, accents kept. Phrases rather than single words where a word
// alone is common in an ordinary hard conversation ("dø", "slå").
const CRISIS_PHRASES = [
  "selvmord",
  "tage mit eget liv",
  "tage mit liv",
  "slå mig selv ihjel",
  "dræbe mig selv",
  "gøre en ende på det",
  "gøre en ende på mit liv",
  "skade mig selv",
  "skære i mig selv",
  "vil ikke leve",
  "ikke leve mere",
  "orker ikke at leve",
  "har lyst til at dø",
  "vil dø",
  "slå dig ihjel",
  "slå ham ihjel",
  "slå hende ihjel",
  "dræbe ham",
  "dræbe hende",
  "dræbe dig",
  "gøre ham fortræd",
  "gøre hende fortræd",
  "skyde ham",
  "skyde hende",
];

// Harm in any word order: "slår jeg ham ihjel", "kunne dræbe hende".
const CRISIS_PATTERNS = [
  /(^|\s)(slå|slår|slog)\s+(\p{L}+\s+){0,2}(ham|hende|dig|dem|jer|mig selv)\s+ihjel(\s|$)/u,
  /(^|\s)dræb(e|er)\s+(\p{L}+\s+){0,2}(ham|hende|dig|dem|jer|mig)(\s|$)/u,
];

export type SafetyReason = "moderation" | "words" | "model";

export function crisisInWords(text: string): boolean {
  // Punctuation becomes space, so "ihjel." and "selvmord?" are caught too.
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  return CRISIS_PHRASES.some((p) => t.includes(p)) || CRISIS_PATTERNS.some((r) => r.test(t));
}

export function crisisInScores(scores: ModerationScores | null): boolean {
  if (!scores) return false;
  return CRISIS_CATEGORIES.some((c) => (scores[c] ?? 0) >= MODERATION_THRESHOLD);
}

/** Why what the person just said stops the conversation, or null when it does not. */
export function checkUserTurn(text: string, scores: ModerationScores | null): SafetyReason | null {
  if (crisisInWords(text)) return "words";
  if (crisisInScores(scores)) return "moderation";
  return null;
}

/** Whether the model's reply asks for the stop. */
export function replyAsksToStop(reply: string): boolean {
  return reply.includes(STOP_MARKER);
}
