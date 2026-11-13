"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SCORE_KEYS } from "@/domain/feedback";
import { cn } from "@/lib/cn";
import { PrimaryButton, QuietButton } from "./fields";
import { postJson, type ApiError, type Feedback, type ScenarioDraft, type Turn } from "./types";

/**
 * Feedback after the conversation: four scores as "x af 5" and three
 * moments in the person's own words. Asked for once, shown, and gone when
 * the page closes; "Hent som PDF" prints it.
 */

type Answer = { kind: "feedback"; feedback: Feedback } | { kind: "tooShort" } | { error: ApiError };

export function FeedbackView({
  scenario,
  history,
  ticket,
  notice,
  inviteProfile,
  onAgain,
}: {
  scenario: ScenarioDraft;
  history: Turn[];
  ticket: string;
  notice?: string;
  /** After the first conversation: offer the profile, which sharpens the feedback. */
  inviteProfile: boolean;
  onAgain: () => void;
}) {
  const t = useTranslations("feedback");
  const te = useTranslations("errors");
  const [answer, setAnswer] = useState<Answer | null>(null);

  // Asked for once: feedback costs a call to the model, so a second
  // mount (React's development check) must not ask again.
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void postJson<Answer>("/api/conversation/feedback", { ticket, scenario, history }).then(
      setAnswer,
    );
  }, [ticket, scenario, history]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex min-h-8 items-center justify-end print:hidden">
        <QuietButton onClick={onAgain} aria-label={t("close")} className="text-[16px]">
          ✕
        </QuietButton>
      </div>

      <div className="flex flex-1 flex-col gap-6 pt-2">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-bronze uppercase">
            {t("label")}
          </p>
          <h1 className="text-[26px] leading-tight font-normal">
            {t("title", { name: scenario.name })}
          </h1>
          {scenario.goal && (
            <p className="text-[13px] text-slate">{t("goal", { goal: scenario.goal })}</p>
          )}
          {notice && <p className="text-[13px] text-slate">{notice}</p>}
        </div>

        {!answer && (
          <p role="status" className="text-[14px] text-slate">
            {t("loading")}
          </p>
        )}
        {answer && "error" in answer && (
          <p role="alert" className="text-[14px] text-danger">
            {te(answer.error === "limit" ? "generic" : answer.error)}
          </p>
        )}
        {answer && "kind" in answer && answer.kind === "tooShort" && (
          <p className="text-[14px] text-slate">{t("tooShort")}</p>
        )}
        {answer && "kind" in answer && answer.kind === "feedback" && (
          <>
            <dl className="flex flex-col">
              {SCORE_KEYS.map((k) => {
                const v = answer.feedback.scores[k];
                return (
                  <div key={k} className="grid grid-cols-[82px_1fr_52px] items-center gap-3 py-1.5">
                    <dt className="text-[14px]">{t(`scores.${k}`)}</dt>
                    <div className="h-[3px] bg-hairline-soft" aria-hidden>
                      <div className="h-full bg-ink" style={{ width: `${v * 20}%` }} />
                    </div>
                    <dd className="text-right text-[13px] text-slate">
                      {t("scoreOf", { value: v })}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <ul className="flex flex-col" aria-label={t("moments")}>
              {answer.feedback.moments.map((m) => (
                <li
                  key={m.quote}
                  className="flex flex-col gap-1 border-t border-hairline-soft pt-3.5 pb-1"
                >
                  <span
                    className={cn(
                      "text-[11px] font-semibold tracking-[0.12em] uppercase",
                      m.kind === "good" ? "text-success" : "text-warning",
                    )}
                  >
                    {m.kind === "good" ? t("good") : t("try")}
                  </span>
                  <span className="text-[15px]">“{m.quote}”</span>
                  <span className="text-[13px] text-slate">{m.why}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {inviteProfile && answer && "kind" in answer && answer.kind === "feedback" && (
        <p className="mt-6 text-[13px] text-slate print:hidden">
          <Link href="/profil" className="underline underline-offset-2 hover:text-ink">
            {t("profile")}
          </Link>
        </p>
      )}
      <div className="mt-6 flex flex-col items-center gap-1.5 print:hidden">
        <PrimaryButton onClick={onAgain}>{t("again")}</PrimaryButton>
        <QuietButton onClick={() => window.print()} disabled={!answer || "error" in answer}>
          {t("pdf")} · {t("notSaved").split(".")[0]}
        </QuietButton>
      </div>
    </div>
  );
}
