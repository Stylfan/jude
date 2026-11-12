import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { ProfileForm } from "@/components/profile/profile-form";
import { withUser } from "@/db/client";
import { getProfile } from "@/services/profiles";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("profile"))("title") };
}

/** What the person tells Jude about themselves: the only thing Jude stores that they typed. */
export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await withUser(user.id, (tx) => getProfile(tx, user.id));
  return (
    <ProfileForm
      first={profile === null}
      initial={{
        firstName: profile?.firstName ?? "",
        age: profile?.age ?? null,
        roles: profile?.roles ?? [],
        improve: profile?.improve ?? "",
      }}
    />
  );
}
