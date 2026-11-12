import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { sourceUrl } from "@/lib/demo-mode";

/**
 * The quiet line over every page of a demo visit: it is a demo, when what
 * the visitor typed about themselves is deleted, and where to get the code.
 */
export async function DemoBanner({ expiresAt }: { expiresAt: number }) {
  const t = await getTranslations("demoVisit");
  const at = new Date(expiresAt);
  const zone = { timeZone: "Europe/Copenhagen" } as const;
  const day = at.toLocaleDateString("da-DK", { ...zone, weekday: "long" });
  const time = at.toLocaleTimeString("da-DK", { ...zone, hour: "2-digit", minute: "2-digit" });
  const when = `${day} kl. ${time}`;
  return (
    <div
      role="note"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-hairline-soft bg-sand/60 px-4 py-2 text-[12.5px] text-slate print:hidden"
    >
      <span>{t("banner", { when })}</span>
      <a
        href={sourceUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-4"
      >
        {t("bannerSource")}
      </a>
      <Link href="/account#leave" className="underline underline-offset-4">
        {t("end")}
      </Link>
    </div>
  );
}
