import { requireUser } from "@/auth/session";
import { DemoBanner } from "@/components/app/demo-banner";
import { getDb } from "@/db/client";
import { maybeCleanDemos } from "@/services/demo-visits";

export const dynamic = "force-dynamic";

/**
 * The signed-in pages: no frame around them, so the conversation has the
 * whole screen. A demo visit gets one quiet line on top.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // On a demo installation, visits whose time is up go while others use it.
  void maybeCleanDemos(getDb()).catch(() => undefined);
  return (
    <div className="flex min-h-dvh flex-col">
      {user.demoExpiresAt !== null && <DemoBanner expiresAt={user.demoExpiresAt} />}
      {children}
    </div>
  );
}
