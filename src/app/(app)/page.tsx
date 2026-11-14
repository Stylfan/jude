import { requireUser } from "@/auth/session";
import { Coach } from "@/components/conversation/coach";
import { withUser } from "@/db/client";
import { readLimits } from "@/domain/limits";
import { publicVoices, readVoices } from "@/domain/voices";
import { getProfile, hasConsented } from "@/services/profiles";

export const dynamic = "force-dynamic";

/**
 * The front page: what you told Jude about yourself (folded), who you
 * talk to, what about, and the conversation itself.
 */
export default async function ConversationPage() {
  const user = await requireUser();
  const profile = await withUser(user.id, (tx) => getProfile(tx, user.id));
  return (
    <Coach
      consented={hasConsented(profile)}
      profile={{
        firstName: profile?.firstName ?? "",
        age: profile?.age == null ? "" : String(profile.age),
        roles: profile?.roles ?? [],
        improve: profile?.improve ?? "",
      }}
      voices={publicVoices(readVoices())}
      secondsPerTurn={readLimits().secondsPerTurn}
    />
  );
}
