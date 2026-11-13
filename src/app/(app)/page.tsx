import { requireUser } from "@/auth/session";
import { Coach } from "@/components/conversation/coach";
import { withUser } from "@/db/client";
import { readLimits } from "@/domain/limits";
import { publicVoices, readVoices } from "@/domain/voices";
import { getProfile, hasConsented } from "@/services/profiles";

export const dynamic = "force-dynamic";

/**
 * The conversation, straight away: the profile is offered after the first
 * feedback instead of before the first conversation.
 */
export default async function ConversationPage() {
  const user = await requireUser();
  const profile = await withUser(user.id, (tx) => getProfile(tx, user.id));
  return (
    <Coach
      consented={hasConsented(profile)}
      hasProfile={
        profile !== null &&
        (profile.firstName !== "" || profile.roles.length > 0 || profile.improve !== "")
      }
      roles={profile?.roles.map((r) => r.label) ?? []}
      voices={publicVoices(readVoices())}
      secondsPerTurn={readLimits().secondsPerTurn}
    />
  );
}
