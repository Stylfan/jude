"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { PrimaryButton } from "./fields";

/**
 * Shown when the safety stop ends a conversation: calm words, where to get
 * help, and only a way out. The conversation behind it cannot be resumed;
 * its ticket is marked stopped on the server.
 */
export function CrisisCard({ onClose }: { onClose: () => void }) {
  const t = useTranslations("crisis");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center gap-7">
        <div className="flex flex-col gap-3">
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-[26px] leading-tight font-normal outline-none"
          >
            {t("title")}
          </h1>
          <p className="text-[15px] leading-relaxed text-slate">{t("body")}</p>
        </div>
        <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
          <a href="tel:70201201" className="flex flex-col gap-0.5 px-4 py-3.5 hover:bg-sand/40">
            <span className="text-[12.5px] text-slate">{t("lifeline")}</span>
            <span className="text-[22px] tracking-wide">{t("lifelineNumber")}</span>
            <span className="text-[12.5px] text-slate">{t("lifelineHint")}</span>
          </a>
          <a
            href="tel:112"
            className="flex flex-col gap-0.5 border-t border-hairline-soft px-4 py-3.5 hover:bg-sand/40"
          >
            <span className="text-[12.5px] text-slate">{t("emergency")}</span>
            <span className="text-[22px] tracking-wide">{t("emergencyNumber")}</span>
          </a>
        </div>
      </div>
      <div className="mt-6">
        <PrimaryButton onClick={onClose}>{t("close")}</PrimaryButton>
      </div>
    </div>
  );
}
