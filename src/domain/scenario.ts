import { z } from "zod";

/**
 * The set-up of one conversation: who you are in it, who the other person
 * is, and, if you want, why you are talking. Lives in the page and in the
 * request only; never stored. First names only and nothing that points to
 * a real person (CLAUDE.md), checked here and said in the form.
 */

export const GENDERS = ["kvinde", "mand", "andet"] as const;
export const RELATIONS = [
  "medarbejder",
  "kollega",
  "chef",
  "direktør",
  "kunde",
  "søn",
  "datter",
  "partner",
  "forælder",
  "bror",
  "søster",
  "ven",
  "andet",
] as const;
export const REACTIONS = [
  "lukker i",
  "bliver vred",
  "skifter emne",
  "bliver ked af det",
  "forsvarer sig",
  "er rolig",
] as const;
export const DIFFICULTIES = ["let", "middel", "svær"] as const;

export type Gender = (typeof GENDERS)[number];
/** One of RELATIONS, or the person's own word for it ("nabo"). */
export type Relation = string;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** One word of letters, a hyphen allowed: "Lone", "Anne-Mette". No surname. */
const FIRST_NAME = /^[\p{L}][\p{L}'’]*(?:-[\p{L}][\p{L}'’]*)?$/u;

// Things that point to a real person or can reach them.
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const CPR = /\b\d{6}-?\d{4}\b/;
const PHONE = /(?:\+45\s?)?\b\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b/;

export function containsIdentifiers(text: string): boolean {
  return EMAIL.test(text) || CPR.test(text) || PHONE.test(text);
}

export const firstName = z.string().trim().min(1).max(30).regex(FIRST_NAME);

/** A free-text field: trimmed, capped, and without e-mail, phone or CPR numbers. */
export function freeText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .refine((v) => !containsIdentifiers(v), { message: "identifier" });
}

export function scenarioSchema(maxChars: number) {
  return z.object({
    /** Your role in this conversation, from the profile or typed: "Leder", "Far". */
    yourRole: freeText(60).pipe(z.string().min(1)),
    name: firstName,
    age: z.coerce.number().int().min(3).max(110),
    gender: z.enum(GENDERS),
    /** One of RELATIONS or the person's own word, lower case: "medarbejder", "nabo". */
    relation: freeText(40)
      .pipe(z.string().min(1))
      .transform((v) => v.toLowerCase()),
    /** The context; everything below may be left empty ("Spring over"). */
    about: freeText(maxChars).default(""),
    goal: freeText(maxChars).default(""),
    reaction: z.enum(REACTIONS).or(z.literal("")).default(""),
    difficulty: z.enum(DIFFICULTIES).default("middel"),
    voice: z.string().trim().max(80).default(""),
  });
}

export type Scenario = z.infer<ReturnType<typeof scenarioSchema>>;

/** Whether the person skipped the "why" step. */
export function hasContext(s: Scenario): boolean {
  return s.about !== "" || s.goal !== "" || s.reaction !== "";
}
