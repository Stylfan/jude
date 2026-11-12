"use server";

import { readLimits } from "@/domain/limits";
import { z } from "zod";
import { giveConsent, profileSchema, saveProfile } from "@/services/profiles";
import { run, type Result } from "./result";

/** Saving the profile: what the person tells Jude about themselves, and nothing else. */
export async function saveProfileAction(raw: unknown): Promise<Result> {
  return run(profileSchema(readLimits().charsPerField), raw, async (db, userId, input) => {
    await saveProfile(db, userId, input);
    return undefined;
  });
}

/** The yes before the first conversation. */
export async function consentAction(): Promise<Result> {
  return run(z.object({}), {}, async (db, userId) => {
    await giveConsent(db, userId);
    return undefined;
  });
}
