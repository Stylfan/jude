"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DIFFICULTIES,
  GENDERS,
  REACTIONS,
  RELATIONS,
  type Difficulty,
  type Gender,
  type Relation,
} from "@/domain/scenario";
import { voicesFor, type PublicVoice } from "@/domain/voices";
import { cn } from "@/lib/cn";
import { Field, PrimaryButton, QuietButton, Segments, Select, TextArea, TextInput } from "./fields";
import type { ScenarioDraft } from "./types";

/**
 * The set-up in three short steps: who, why (can be skipped) and the voice.
 * One question per screen, the one filled button at the bottom.
 */

const OTHER = "__other";
const DEFAULT_ROLES = ["Leder", "Kollega", "Medarbejder", "Forælder", "Partner", "Ven"];

export function blankScenario(roles: string[]): ScenarioDraft {
  return {
    yourRole: roles[0] ?? DEFAULT_ROLES[0]!,
    name: "",
    age: "",
    gender: "kvinde",
    relation: "medarbejder",
    about: "",
    goal: "",
    reaction: "",
    difficulty: "middel",
    voice: "",
  };
}

export function Setup({
  roles,
  voices,
  busy,
  error,
  onStart,
  onBack,
  step,
}: {
  roles: string[];
  voices: PublicVoice[];
  busy: boolean;
  error: string | null;
  step: number;
  onBack: () => void;
  onStart: (s: ScenarioDraft, next: boolean) => void;
}) {
  const t = useTranslations("setup");
  const choices = roles.length > 0 ? roles : DEFAULT_ROLES;
  const [s, setS] = useState<ScenarioDraft>(() => blankScenario(choices));
  const [ownRole, setOwnRole] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const set = <K extends keyof ScenarioDraft>(k: K, v: ScenarioDraft[K]) =>
    setS((p) => ({ ...p, [k]: v }));
  const who = s.name.trim();
  const age = Number(s.age);
  const whoDone = s.name.trim() !== "" && s.yourRole.trim() !== "" && age >= 3 && age <= 110;
  const sorted = voicesFor(voices, s.gender, age || 40);
  const voice = s.voice || sorted[0]?.id || "";

  const play = (id: string) => {
    audio.current?.pause();
    audio.current = new Audio(`/api/voices/${encodeURIComponent(id)}/preview`);
    void audio.current.play().catch(() => undefined);
  };

  const next = () => onStart({ ...s, voice }, step < 2);
  const titles = [t("who.title"), t("why.title"), t("voice.title", { name: who })];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex min-h-8 items-center justify-between">
        {step > 0 ? (
          <QuietButton onClick={onBack} aria-label={t("back")} className="text-[18px] leading-none">
            ←
          </QuietButton>
        ) : (
          <span />
        )}
        <div
          className="flex w-[72px] gap-1.5"
          role="img"
          aria-label={t("stepOf", { step: step + 1, total: 3 })}
        >
          {[0, 1, 2].map((i) => (
            <i key={i} className={cn("h-0.5 flex-1", i <= step ? "bg-bronze" : "bg-hairline")} />
          ))}
        </div>
      </div>

      <h1 className="mt-7 mb-6 text-[26px] leading-tight font-normal">{titles[step]}</h1>

      <div className="flex flex-1 flex-col gap-4">
        {step === 0 && (
          <>
            <Field label={t("who.yourRole")} htmlFor="your-role">
              {ownRole ? (
                <TextInput
                  id="your-role"
                  autoFocus
                  maxLength={60}
                  placeholder={t("who.yourRoleOther")}
                  value={s.yourRole}
                  onChange={(e) => set("yourRole", e.target.value)}
                />
              ) : (
                <Select
                  id="your-role"
                  value={s.yourRole}
                  onChange={(e) => {
                    if (e.target.value === OTHER) {
                      setOwnRole(true);
                      set("yourRole", "");
                    } else set("yourRole", e.target.value);
                  }}
                  options={[
                    ...choices.map((r) => ({ value: r, label: r })),
                    { value: OTHER, label: t("who.otherRole") },
                  ]}
                />
              )}
            </Field>
            <Field label={t("who.name")} hint={t("who.nameHint")} htmlFor="name">
              <TextInput
                id="name"
                autoComplete="off"
                maxLength={30}
                value={s.name}
                onChange={(e) => set("name", e.target.value.replace(/\s/g, ""))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("who.age")} htmlFor="age">
                <TextInput
                  id="age"
                  inputMode="numeric"
                  maxLength={3}
                  value={s.age}
                  onChange={(e) => set("age", e.target.value.replace(/\D/g, ""))}
                />
              </Field>
              <Field label={t("who.gender")} htmlFor="gender">
                <Select
                  id="gender"
                  value={s.gender}
                  onChange={(e) => set("gender", e.target.value as Gender)}
                  options={GENDERS.map((g) => ({ value: g, label: t(`genders.${g}`) }))}
                />
              </Field>
            </div>
            <Field
              label={s.name.trim() ? t("who.relation", { name: who }) : t("who.relationFallback")}
              htmlFor="relation"
            >
              <Select
                id="relation"
                value={s.relation}
                onChange={(e) => set("relation", e.target.value as Relation)}
                options={RELATIONS.map((r) => ({ value: r, label: t(`relations.${r}`) }))}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label={t("why.about")} htmlFor="about">
              <TextArea
                id="about"
                maxLength={500}
                placeholder={t("why.aboutPlaceholder")}
                value={s.about}
                onChange={(e) => set("about", e.target.value)}
              />
            </Field>
            <Field label={t("why.goal")} htmlFor="goal">
              <TextInput
                id="goal"
                maxLength={500}
                placeholder={t("why.goalPlaceholder")}
                value={s.goal}
                onChange={(e) => set("goal", e.target.value)}
              />
            </Field>
            <Field label={t("why.reaction", { name: who })} htmlFor="reaction">
              <Select
                id="reaction"
                value={s.reaction}
                onChange={(e) => set("reaction", e.target.value)}
                options={[
                  { value: "", label: t("why.reactionNone") },
                  ...REACTIONS.map((r) => ({ value: r, label: t(`reactions.${r}`) })),
                ]}
              />
            </Field>
            <Segments<Difficulty>
              label={t("why.difficulty")}
              value={s.difficulty}
              onChange={(v) => set("difficulty", v)}
              options={DIFFICULTIES.map((d) => ({ value: d, label: t(`difficulties.${d}`) }))}
            />
            <p className="text-[12px] text-slate">{t("why.privacy")}</p>
          </>
        )}

        {step === 2 &&
          (sorted.length === 0 ? (
            <p className="text-[14px] text-slate">{t("voice.none", { name: who })}</p>
          ) : (
            <>
              <div
                role="radiogroup"
                aria-label={titles[2]}
                className="flex flex-col overflow-hidden rounded-[10px] border border-line bg-surface"
              >
                {sorted.map((v, i) => (
                  <div
                    key={v.id}
                    className={cn("flex items-center", i > 0 && "border-t border-hairline-soft")}
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={v.id === voice}
                      onClick={() => set("voice", v.id)}
                      className="flex flex-1 items-center gap-3 px-3.5 py-3 text-left text-[14.5px]"
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0 rounded-full border",
                          v.id === voice ? "border-[5px] border-ink" : "border-line",
                        )}
                      />
                      {v.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => play(v.id)}
                      className="px-3.5 py-3 text-[12px] text-bronze-deep hover:text-ink"
                      aria-label={`${t("voice.listen")}: ${v.label}`}
                    >
                      ▶ {t("voice.listen")}
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[12.5px] text-slate">
                {t("voice.fits", { gender: t(`gendersLower.${s.gender}`), age: s.age })}
              </p>
            </>
          ))}
      </div>

      <div className="mt-6 flex flex-col items-center gap-1.5">
        {error && (
          <p role="alert" className="text-center text-[13px] text-danger">
            {error}
          </p>
        )}
        <PrimaryButton onClick={next} disabled={busy || (step === 0 && !whoDone)}>
          {step < 2 ? t("next") : busy ? t("starting") : t("start")}
        </PrimaryButton>
        {step === 1 ? (
          <QuietButton
            onClick={() => {
              const cleared = { ...s, about: "", goal: "", reaction: "", voice };
              setS(cleared);
              onStart(cleared, true);
            }}
          >
            {t("skip")}
          </QuietButton>
        ) : (
          <span className="h-8" />
        )}
      </div>
    </div>
  );
}
