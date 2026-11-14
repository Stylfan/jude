import type { ProfileRole } from "@/db/schema";
import type { Turn } from "@/domain/conversation";
import type { Feedback } from "@/domain/feedback";
import type { Difficulty, Gender, Relation } from "@/domain/scenario";

/** The set-up as the page holds it. Never stored; sent with every request. */
export type ScenarioDraft = {
  yourRole: string;
  name: string;
  age: string;
  gender: Gender;
  relation: Relation;
  about: string;
  goal: string;
  reaction: string;
  difficulty: Difficulty;
  voice: string;
};

/** What the person tells Jude about themselves, as the front page edits it. */
export type ProfileDraft = {
  firstName: string;
  age: string;
  roles: ProfileRole[];
  improve: string;
};

export type Started = { ticket: string; minutes: number; voice: string | null };

export type { Feedback, Turn };

export type ApiError =
  | "unauthorized"
  | "invalid"
  | "notConfigured"
  | "ai"
  | "generic"
  | "stopped"
  | "tooLong"
  | "limit"
  | "consent";

/** The limit an answer names, when it is one. */
export type LimitWhich = "account" | "server" | "time" | "turns";

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json().catch(() => ({ error: "generic" }))) as T;
}
