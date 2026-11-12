import type { Gender } from "./scenario";

/**
 * The voices the other person can speak with. Danish has no preset voices
 * at Mistral, so each one is cloned from a recording made with the
 * speaker's written consent (docs/voices.md) and configured in JUDE_VOICES
 * as JSON:
 *
 *   [{"id":"rolig-kvinde","label":"Rolig","gender":"kvinde","ageMin":40,"ageMax":70,"voiceId":"…"}]
 *
 * With no voices configured, Jude still works: the other person answers in
 * subtitles only, and the set-up says so.
 */

export type Voice = {
  id: string;
  label: string;
  gender: Exclude<Gender, "andet">;
  ageMin: number;
  ageMax: number;
  /** Mistral's id for the saved voice. Server only; never sent to the page. */
  voiceId: string;
};

export type PublicVoice = Omit<Voice, "voiceId">;

function isVoice(v: unknown): v is Voice {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    /^[a-z0-9-]{1,40}$/.test(o.id) &&
    typeof o.label === "string" &&
    o.label.length > 0 &&
    (o.gender === "kvinde" || o.gender === "mand") &&
    typeof o.ageMin === "number" &&
    typeof o.ageMax === "number" &&
    o.ageMin <= o.ageMax &&
    typeof o.voiceId === "string" &&
    o.voiceId.length > 0
  );
}

export function readVoices(env: Record<string, string | undefined> = process.env): Voice[] {
  const raw = env.JUDE_VOICES?.trim();
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isVoice) : [];
  } catch {
    return [];
  }
}

export function publicVoices(voices: Voice[]): PublicVoice[] {
  return voices.map((v) => ({
    id: v.id,
    label: v.label,
    gender: v.gender,
    ageMin: v.ageMin,
    ageMax: v.ageMax,
  }));
}

/**
 * The voices that fit a person, best first: the same gender and an age in
 * range, then the same gender, then the rest. "andet" fits every voice.
 */
export function voicesFor(voices: PublicVoice[], gender: Gender, age: number): PublicVoice[] {
  const score = (v: PublicVoice) => {
    const sameGender = gender === "andet" || v.gender === gender;
    const inRange = age >= v.ageMin && age <= v.ageMax;
    return (sameGender ? 2 : 0) + (inRange ? 1 : 0);
  };
  return [...voices].sort((a, b) => score(b) - score(a));
}

/** The configured voice for an id, or the best fit, or none. */
export function pickVoice(voices: Voice[], id: string, gender: Gender, age: number): Voice | null {
  const chosen = voices.find((v) => v.id === id);
  if (chosen) return chosen;
  const best = voicesFor(voices, gender, age)[0];
  return best ? (voices.find((v) => v.id === best.id) ?? null) : null;
}
