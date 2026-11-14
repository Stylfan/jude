"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * The yes before the first conversation, as one box above "Start
 * samtalen": what is said goes to Mistral, and sensitive or identifying
 * details are best left out. The server refuses to start without it and
 * stores the time on the profile.
 */
export function ConsentCheck({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const t = useTranslations("consent");
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[12px] leading-relaxed text-slate">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[3px] size-4 shrink-0 accent-ink"
      />
      <span>
        {t.rich("check", {
          link: (chunks) => (
            <Link href="/privatliv" className="underline underline-offset-2 hover:text-ink">
              {chunks}
            </Link>
          ),
        })}
      </span>
    </label>
  );
}
