import type { ChatMessage } from "@/domain/prompts";
import { fakeAi, fakeAiAllowed } from "./fake-ai";
import type { ModerationScores } from "@/domain/safety";

/**
 * Mistral's API (EU): transcription, moderation, the chat model and
 * speech. Plain fetch, no SDK. Nothing that passes through here is logged:
 * an error carries the endpoint and the HTTP status only, never a body,
 * because a body may echo what the person said.
 */

export interface Ai {
  /** Danish speech to text. `audio` is a WAV file. */
  transcribe(audio: Uint8Array): Promise<string>;
  /** Category scores for a text, or throws when the check could not be made. */
  moderate(text: string): Promise<ModerationScores>;
  chat(messages: ChatMessage[], options?: { json?: boolean; maxTokens?: number }): Promise<string>;
  /** Speech as MP3 bytes for a saved (cloned) voice. */
  speak(text: string, voiceId: string): Promise<Uint8Array>;
}

export class AiError extends Error {
  constructor(
    readonly endpoint: string,
    readonly status: number,
  ) {
    super(`mistral ${endpoint} answered ${status}`);
  }
}

export class AiNotConfigured extends Error {
  constructor() {
    super("MISTRAL_API_KEY is not set; see .env.example");
  }
}

const BASE = "https://api.mistral.ai";
const TIMEOUT_MS = 45_000;

export type MistralConfig = {
  apiKey: string;
  chatModel: string;
  transcribeModel: string;
  speechModel: string;
  moderationModel: string;
};

export function readMistralConfig(
  env: Record<string, string | undefined> = process.env,
): MistralConfig | null {
  const apiKey = env.MISTRAL_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    chatModel: env.JUDE_CHAT_MODEL?.trim() || "mistral-medium-latest",
    transcribeModel: env.JUDE_TRANSCRIBE_MODEL?.trim() || "voxtral-mini-transcribe-3",
    speechModel: env.JUDE_SPEECH_MODEL?.trim() || "voxtral-mini-tts-3-0",
    moderationModel: env.JUDE_MODERATION_MODEL?.trim() || "mistral-moderation-2603",
  };
}

export function mistral(config: MistralConfig): Ai {
  const auth = { Authorization: `Bearer ${config.apiKey}` };

  async function post(endpoint: string, body: BodyInit, json: boolean): Promise<unknown> {
    const res = await fetch(`${BASE}${endpoint}`, {
      method: "POST",
      headers: json ? { ...auth, "Content-Type": "application/json" } : auth,
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      await res.body?.cancel();
      throw new AiError(endpoint, res.status);
    }
    return res.json();
  }

  return {
    async transcribe(audio) {
      const form = new FormData();
      form.append("model", config.transcribeModel);
      form.append("language", "da");
      form.append("file", new Blob([audio as BlobPart], { type: "audio/wav" }), "turn.wav");
      const data = (await post("/v1/audio/transcriptions", form, false)) as { text?: unknown };
      return typeof data.text === "string" ? data.text : "";
    },

    async moderate(text) {
      const data = (await post(
        "/v1/moderations",
        JSON.stringify({ model: config.moderationModel, input: [text] }),
        true,
      )) as { results?: { category_scores?: Record<string, unknown> }[] };
      const scores = data.results?.[0]?.category_scores;
      if (!scores) throw new AiError("/v1/moderations", 200);
      return Object.fromEntries(
        Object.entries(scores).map(([k, v]) => [k, typeof v === "number" ? v : 0]),
      );
    },

    async chat(messages, options = {}) {
      const data = (await post(
        "/v1/chat/completions",
        JSON.stringify({
          model: config.chatModel,
          messages,
          temperature: options.json ? 0.2 : 0.7,
          max_tokens: options.maxTokens ?? 300,
          ...(options.json ? { response_format: { type: "json_object" } } : {}),
        }),
        true,
      )) as { choices?: { message?: { content?: unknown } }[] };
      const content = data.choices?.[0]?.message?.content;
      return typeof content === "string" ? content : "";
    },

    async speak(text, voiceId) {
      const data = (await post(
        "/v1/audio/speech",
        JSON.stringify({
          model: config.speechModel,
          input: text,
          voice_id: voiceId,
          response_format: "mp3",
        }),
        true,
      )) as { audio_data?: unknown };
      if (typeof data.audio_data !== "string") throw new AiError("/v1/audio/speech", 200);
      return Buffer.from(data.audio_data, "base64");
    },
  };
}

/** Whether a conversation can be held: a key, or the stand-in on a development machine. */
export function aiAvailable(): boolean {
  return readMistralConfig() !== null || fakeAiAllowed();
}

/** The configured client, or throws AiNotConfigured. */
export function getAi(): Ai {
  const config = readMistralConfig();
  if (config) return mistral(config);
  if (fakeAiAllowed()) return fakeAi();
  throw new AiNotConfigured();
}
