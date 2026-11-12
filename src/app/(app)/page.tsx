import { redirect } from "next/navigation";
import { requireUser } from "@/auth/session";
import { Coach } from "@/components/conversation/coach";
import { withUser } from "@/db/client";
import { readLimits } from "@/domain/limits";
import { publicVoices, readVoices } from "@/domain/voices";
import { getProfile, hasConsented } from "@/services/profiles";

export const dynamic = "force-dynamic";

/**
 * The conversation. The first visit goes by the profile, so the person
 * sees what is kept (only that) before the first conversation.
 */
export default async function ConversationPage() {
  const user = await requireUser();
  const profile = await withUser(user.id, (tx) => getProfile(tx, user.id));
  if (!profile) redirect("/profil");
  return (
    <Coach
      consented={hasConsented(profile)}
      roles={profile.roles.map((r) => r.label)}
      voices={publicVoices(readVoices())}
      secondsPerTurn={readLimits().secondsPerTurn}
    />
  );
}
