import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/auth/session";
import { DeleteAccount } from "@/components/account/delete-account";
import { EndDemo } from "@/components/account/end-demo";
import { PasskeyPanel } from "@/components/account/passkey-panel";
import { TotpPanel } from "@/components/account/totp-panel";
import { LogoutButton } from "@/components/auth/logout-button";
import { buttonClass } from "@/components/ui/controls";
import { Panel, Section, SettingRow } from "@/components/ui/layout";
import { getDb } from "@/db/client";
import { operator } from "@/lib/operator";
import { listPasskeys, recoveryCodesLeft } from "@/services/factors";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("account"))("title") };
}

/** The account as settings: who you are, how you sign in, your data out, and the way to leave. */
export default async function AccountPage() {
  const user = await requireUser();
  const t = await getTranslations("account");
  const tl = await getTranslations("legal");
  const db = getDb();
  const op = operator();
  const demo = user.demoExpiresAt !== null;
  const [passkeys, codesLeft] = demo
    ? [[], 0]
    : await Promise.all([listPasskeys(db, user.id), recoveryCodesLeft(db, user.id)]);

  return (
    <main id="content" className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-6 pt-5 pb-12">
      <div className="flex min-h-8 items-center justify-between">
        <Link
          href="/profil"
          className="py-1.5 text-[18px] leading-none text-slate hover:text-ink"
          aria-label={t("back")}
        >
          ←
        </Link>
        {!demo && <LogoutButton />}
      </div>
      <h1 className="-mt-2 text-[26px] leading-tight font-normal">{t("title")}</h1>

      {!demo && (
        <>
          <Section id="profile" label={t("profile.title")}>
            <Panel>
              <SettingRow label={t("profile.email")}>
                <span className="text-[14px] text-ink">{user.email}</span>
              </SettingRow>
            </Panel>
          </Section>
          <Section id="security" label={t("security.title")}>
            <Panel>
              <TotpPanel enabled={user.totpSecret !== null} codesLeft={codesLeft} />
              <PasskeyPanel passkeys={passkeys} />
            </Panel>
          </Section>
        </>
      )}

      <Section id="data" label={t("export.label")}>
        <Panel>
          <SettingRow label={t("export.title")} hint={t("export.hint")}>
            <a href="/account/export/json" className={buttonClass("secondary", "sm")} download>
              {t("export.json")}
            </a>
          </SettingRow>
        </Panel>
      </Section>

      {op && (
        <Section id="about" label={tl("accountLabel")}>
          <Panel className="flex flex-wrap items-center gap-x-5 gap-y-2 py-4 text-[13px]">
            <span className="text-slate">{tl("accountBody", { name: op.name })}</span>
            <Link href="/privatliv" className="underline underline-offset-4">
              {tl("privacyLink")}
            </Link>
            <Link href="/vilkaar" className="underline underline-offset-4">
              {tl("termsLink")}
            </Link>
          </Panel>
        </Section>
      )}

      <Section id="leave" label={t("delete.label")}>
        <Panel className="border-danger/30">
          <SettingRow label={t("delete.title")} hint={t("delete.lead")}>
            {demo ? <EndDemo /> : <DeleteAccount email={user.email} />}
          </SettingRow>
        </Panel>
      </Section>
    </main>
  );
}
