"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { consentAction } from "@/actions/profile";
import { PrimaryButton } from "./fields";

/**
 * Shown once, before the first conversation: what is said is sent to
 * Mistral, and sensitive matters are best left out. The person says yes
 * with the one button; the server refuses to start a conversation before.
 */
export function ConsentCard({ onAccept }: { onAccept: () => void }) {
  const t = useTranslations("consent");
  const te = useTranslations("errors");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    const result = await consentAction();
    setBusy(false);
    if (!result.ok) {
      setError(te(result.error));
      return;
    }
    onAccept();
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="mt-7 flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium tracking-[0.16em] text-bronze uppercase">
            {t("label")}
          </span>
          <h1 className="text-[26px] leading-tight font-normal">{t("title")}</h1>
        </div>
        <ul className="flex flex-col gap-3.5 border-t border-hairline pt-5">
          {(["sent", "sensitive", "names"] as const).map((key, i) => (
            <li key={key} className="grid grid-cols-[28px_1fr] text-[14.5px] leading-relaxed">
              <span className="text-bronze tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-slate">
          {t.rich("more", {
            link: (chunks) => (
              <Link href="/privatliv" className="underline underline-offset-2 hover:text-ink">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-[13.5px] text-danger">
          {error}
        </p>
      )}
      <div className="mt-6">
        <PrimaryButton onClick={() => void accept()} disabled={busy}>
          {t("accept")}
        </PrimaryButton>
      </div>
    </div>
  );
}
