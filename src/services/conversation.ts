import { capTurn, type Turn } from "@/domain/conversation";
import { enoughForFeedback, parseFeedback, type Feedback } from "@/domain/feedback";
import { feedbackMessages, roleMessages, type ProfileFacts } from "@/domain/prompts";
import { STOP_MARKER, checkUserTurn, replyAsksToStop, type SafetyReason } from "@/domain/safety";
import type { Scenario } from "@/domain/scenario";
import type { Voice } from "@/domain/voices";
import type { Ai } from "./mistral";

/**
 * One turn of a conversation and the feedback at the end. Everything here
 * works on what the request carries and returns it; nothing is stored or
 * logged. The safety stop is checked before the model answers and again
 * on its answer.
 */

export type TurnResult =
  | { kind: "reply"; you: string; other: string; audio: Uint8Array | null }
  | { kind: "empty" }
  | { kind: "stop"; reason: SafetyReason };

export async function takeTurn(
  ai: Ai,
  input: {
    scenario: Scenario;
    me: ProfileFacts | null;
    history: Turn[];
    audio: Uint8Array;
    voice: Voice | null;
    maxChars: number;
  },
): Promise<TurnResult> {
  const you = capTurn(await ai.transcribe(input.audio), input.maxChars);
  if (you.length === 0) return { kind: "empty" };

  // Both checks before the model sees the words. A failed moderation call
  // throws, so the turn fails instead of going on unchecked.
  const scores = await ai.moderate(you);
  const reason = checkUserTurn(you, scores);
  if (reason) return { kind: "stop", reason };

  const history: Turn[] = [...input.history, { who: "you", text: you }];
  const reply = (await ai.chat(roleMessages(input.scenario, input.me, history))).trim();
  if (replyAsksToStop(reply)) return { kind: "stop", reason: "model" };
  const other = reply.replaceAll(STOP_MARKER, "").trim();
  if (other.length === 0) return { kind: "empty" };

  // Without a configured voice, or when speech fails, the subtitle carries the reply.
  let audio: Uint8Array | null = null;
  if (input.voice) {
    try {
      audio = await ai.speak(other, input.voice.voiceId);
    } catch {
      audio = null;
    }
  }
  return { kind: "reply", you, other, audio };
}

export type FeedbackResult = { kind: "feedback"; feedback: Feedback } | { kind: "tooShort" };

export async function giveFeedback(
  ai: Ai,
  input: { scenario: Scenario; me: ProfileFacts | null; history: Turn[] },
): Promise<FeedbackResult> {
  if (!enoughForFeedback(input.history)) return { kind: "tooShort" };
  const messages = feedbackMessages(input.scenario, input.me, input.history);
  // One retry: a model now and then wraps or breaks the JSON.
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await ai.chat(messages, { json: true, maxTokens: 900 });
    const feedback = parseFeedback(raw, input.history);
    if (feedback) return { kind: "feedback", feedback };
  }
  throw new Error("feedback: the model did not answer in the agreed shape");
}
