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
import { coverage, voicesFor, type Coverage, type PublicVoice } from "@/domain/voices";
import { ConsentCheck } from "./consent-card";
import { Field, PrimaryButton, Segments, Select, TextArea, TextInput } from "./fields";
import type { ScenarioDraft } from "./types";

/**
 * The set-up on one page: who you talk to, a folded "background" for why,
 * the voice chosen by itself, and, the first time, the consent. One filled
 * button, "Start samtalen", which also starts the microphone.
 */

const OTHER = "__other";
const DEFAULT_ROLES = ["Leder", "Kollega", "Medarbejder", "Forælder", "Partner", "Ven"];

export function blankScenario(roles: string[], covered: Coverage | null = null): ScenarioDraft {
  return {
    yourRole: roles[0] ?? DEFAULT_ROLES[0]!,
    name: "",
    age: "",
    gender: covered?.genders[0] ?? "kvinde",
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
  consented,
  busy,
  error,
  onStart,
}: {
  roles: string[];
  voices: PublicVoice[];
  consented: boolean;
  busy: boolean;
  error: string | null;
  onStart: (s: ScenarioDraft, consent: boolean) => void;
}) {
  const t = useTranslations("setup");
  const choices = roles.length > 0 ? roles : DEFAULT_ROLES;
  const covered = coverage(voices);
  const [s, setS] = useState<ScenarioDraft>(() => blankScenario(choices, covered));
  const [ownRole, setOwnRole] = useState(false);
  const [more, setMore] = useState(false);
  const [consent, setConsent] = useState(consented);
  const audio = useRef<HTMLAudioElement | null>(null);
  const set = <K extends keyof ScenarioDraft>(k: K, v: ScenarioDraft[K]) =>
    setS((p) => ({ ...p, [k]: v }));
  const who = s.name.trim();
  const age = Number(s.age);
  // Ages and genders without a voice yet are shown, greyed, as coming soon.
  const minAge = covered?.minAge ?? 3;
  const tooYoung = s.age !== "" && age < minAge;
  const ready =
    who !== "" && s.yourRole.trim() !== "" && age >= minAge && age <= 110 && consent && !busy;
  const sorted = voicesFor(voices, s.gender, age || 40);
  const voice = s.voice || sorted[0]?.id || "";
  const chosen = sorted.find((v) => v.id === voice);

  const play = (id: string) => {
    audio.current?.pause();
    audio.current = new Audio(`/api/voices/${encodeURIComponent(id)}/preview`);
    void audio.current.play().catch(() => undefined);
  };

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mt-4 mb-5 text-[26px] leading-tight font-normal">{t("title")}</h1>

      <div className="flex flex-1 flex-col gap-4">
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

        <div className="grid grid-cols-[1fr_72px_minmax(96px,128px)] gap-2.5">
          <Field label={t("who.name")} htmlFor="name">
            <TextInput
              id="name"
              autoComplete="off"
              maxLength={30}
              value={s.name}
              onChange={(e) => set("name", e.target.value.replace(/\s/g, ""))}
            />
          </Field>
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
              options={GENDERS.map((g) => {
                const soon = covered !== null && !covered.genders.includes(g);
                return {
                  value: g,
                  label: soon ? t("who.soon", { label: t(`genders.${g}`) }) : t(`genders.${g}`),
                  disabled: soon,
                };
              })}
            />
          </Field>
        </div>
        <p className="-mt-2.5 text-[12px] text-slate">
          {tooYoung ? t("who.youngSoon", { age: minAge }) : t("who.nameHint")}
        </p>

        <Field
          label={who ? t("who.relation", { name: who }) : t("who.relationFallback")}
          htmlFor="relation"
        >
          <Select
            id="relation"
            value={s.relation}
            onChange={(e) => set("relation", e.target.value as Relation)}
            options={RELATIONS.map((r) => ({ value: r, label: t(`relations.${r}`) }))}
          />
        </Field>

        <button
          type="button"
          aria-expanded={more}
          aria-controls="background"
          onClick={() => setMore((m) => !m)}
          className="self-start py-1 text-left text-[13.5px] text-slate hover:text-ink"
        >
          <span aria-hidden className="mr-1.5 inline-block w-2 text-bronze">
            {more ? "–" : "+"}
          </span>
          {t("why.more")}
        </button>
        {more && (
          <div id="background" className="flex flex-col gap-4">
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
            <Field
              label={who ? t("why.reaction", { name: who }) : t("why.reactionFallback")}
              htmlFor="reaction"
            >
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
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-hairline-soft pt-3 text-[13px] text-slate">
          {sorted.length === 0 ? (
            <span>{t("voice.none", { name: who || t("voice.them") })}</span>
          ) : sorted.length === 1 ? (
            <span>{t("voice.line", { label: chosen?.label ?? "" })}</span>
          ) : (
            <label className="flex flex-1 items-center gap-2">
              <span className="shrink-0">{t("voice.label")}</span>
              <Select
                value={voice}
                onChange={(e) => set("voice", e.target.value)}
                options={sorted.map((v) => ({ value: v.id, label: v.label }))}
                className="py-1.5 text-[13px]"
              />
            </label>
          )}
          {chosen && (
            <button
              type="button"
              onClick={() => play(chosen.id)}
              className="shrink-0 py-1 text-[12px] text-bronze-deep hover:text-ink"
              aria-label={`${t("voice.listen")}: ${chosen.label}`}
            >
              ▶ {t("voice.listen")}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {!consented && <ConsentCheck checked={consent} onChange={setConsent} />}
        {error && (
          <p role="alert" className="text-center text-[13px] text-danger">
            {error}
          </p>
        )}
        <PrimaryButton onClick={() => onStart({ ...s, voice }, consent)} disabled={!ready}>
          {busy ? t("starting") : t("start")}
        </PrimaryButton>
      </div>
    </div>
  );
}
