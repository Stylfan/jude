"use server";

import { readLimits } from "@/domain/limits";
import { profileSchema, saveProfile } from "@/services/profiles";
import { run, type Result } from "./result";

/** Saving the profile: what the person tells Jude about themselves, and nothing else. */
export async function saveProfileAction(raw: unknown): Promise<Result> {
  return run(profileSchema(readLimits().charsPerField), raw, async (db, userId, input) => {
    await saveProfile(db, userId, input);
    return undefined;
  });
}
