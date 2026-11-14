"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { ProfileRole } from "@/db/schema";
import { DIFFICULTIES, GENDERS, REACTIONS, type Gender } from "@/domain/scenario";
import { coverage, voicesFor, type Coverage, type PublicVoice } from "@/domain/voices";
import { ConsentCheck } from "./consent-card";
import { PrimaryButton } from "./fields";
import { Fold, GroupLabel, PickRow, TextRow } from "./rows";
import type { ProfileDraft, ScenarioDraft } from "./types";

/**
 * The front page, phone first (design/forside-2a.html): 01 about you (the
 * profile), 02 who you talk to, 03 what you will talk about (optional),
 * then, the first time, the consent, and "Start samtalen", which also
 * starts the microphone and saves what you told Jude about yourself.
 */

const DEFAULT_ROLES = ["Leder", "Far", "Mor", "Kollega"];
const RELATIONS_SHOWN = [
  "medarbejder",
  "kollega",
  "chef",
  "søn",
  "datter",
  "partner",
  "forælder",
  "ven",
];
const PRIVATE =
  /^(far|mor|forælder|storebror|lillebror|storesøster|lillesøster|bror|søster|onkel|tante|partner|kæreste|husbond|kone|mand|ven|veninde|søn|datter|bedstefar|bedstemor)$/i;
const kindOf = (label: string): ProfileRole["kind"] => (PRIVATE.test(label) ? "private" : "work");

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
  profile: initialProfile,
  voices,
  consented,
  busy,
  error,
  onStart,
}: {
  profile: ProfileDraft;
  voices: PublicVoice[];
  consented: boolean;
  busy: boolean;
  error: string | null;
  onStart: (s: ScenarioDraft, profile: ProfileDraft, consent: boolean) => void;
}) {
  const t = useTranslations("setup");
  const covered = coverage(voices);
  const [me, setMe] = useState<ProfileDraft>(initialProfile);
  const myRoles = me.roles.map((r) => r.label);
  const [s, setS] = useState<ScenarioDraft>(() => blankScenario(myRoles, covered));
  const [open, setOpen] = useState({ me: true, who: false, what: false });
  const [consent, setConsent] = useState(consented);
  const audio = useRef<HTMLAudioElement | null>(null);
  const set = <K extends keyof ScenarioDraft>(k: K, v: ScenarioDraft[K]) =>
    setS((p) => ({ ...p, [k]: v }));
  const toggle = (k: keyof typeof open) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const who = s.name.trim();
  const age = Number(s.age);
  // Ages and genders without a voice yet are shown, greyed, as coming soon.
  const minAge = covered?.minAge ?? 3;
  const isSoon = (g: Gender) => covered !== null && !covered.genders.includes(g);
  const tooYoung = s.age !== "" && age < minAge;
  const ready =
    who !== "" && s.yourRole.trim() !== "" && age >= minAge && age <= 110 && consent && !busy;
  const sorted = voicesFor(voices, s.gender, age || 40);
  const voice = s.voice || sorted[0]?.id || "";
  const chosen = sorted.find((v) => v.id === voice);

  const roleChoices = [...new Set([...myRoles, ...DEFAULT_ROLES, s.yourRole].filter(Boolean))];
  const relationLabel = (r: string) =>
    RELATIONS_SHOWN.includes(r) ? t(`relations.${r}`) : r.charAt(0).toUpperCase() + r.slice(1);
  const relationChoices = [...new Set([...RELATIONS_SHOWN, s.relation])];

  const toggleRole = (label: string) =>
    setMe((p) =>
      p.roles.some((r) => r.label === label)
        ? { ...p, roles: p.roles.filter((r) => r.label !== label) }
        : { ...p, roles: [...p.roles, { label, kind: kindOf(label) }] },
    );

  const play = (id: string) => {
    audio.current?.pause();
    audio.current = new Audio(`/api/voices/${encodeURIComponent(id)}/preview`);
    void audio.current.play().catch(() => undefined);
  };

  return (
    <div className="flex flex-1 flex-col">
      <p className="mt-5 mb-6 text-[25px] leading-tight font-light whitespace-pre-line">
        {t("hello")}
      </p>

      <div className="flex flex-col">
        <Fold
          num="01"
          title={t("me.title")}
          summary={
            me.firstName.trim()
              ? [me.firstName.trim(), myRoles.join(", ")].filter(Boolean).join(" · ")
              : t("me.summary")
          }
          open={open.me}
          onToggle={() => toggle("me")}
        >
          <div>
            <TextRow
              label={t("me.firstName")}
              value={me.firstName}
              onChange={(v) => setMe((p) => ({ ...p, firstName: v.replace(/\s/g, "") }))}
              placeholder={t("add")}
              maxLength={30}
            />
            <TextRow
              label={t("me.age")}
              value={me.age}
              onChange={(v) => setMe((p) => ({ ...p, age: v.replace(/\D/g, "") }))}
              placeholder={t("add")}
              numeric
              maxLength={3}
            />
            <PickRow
              label={t("me.roles")}
              shown={myRoles.join(", ")}
              empty={t("add")}
              choices={[...new Set([...DEFAULT_ROLES, ...myRoles])].map((r) => ({
                value: r,
                label: r,
              }))}
              selected={myRoles}
              onPick={toggleRole}
              multi
              addLabel={t("addOwn")}
              addPlaceholder={t("addPlaceholder")}
            />
            <TextRow
              label={t("me.improve")}
              value={me.improve}
              onChange={(v) => setMe((p) => ({ ...p, improve: v }))}
              placeholder={t("add")}
              maxLength={500}
            />
          </div>
        </Fold>

        <Fold num="02" title={t("who.title")} open={open.who} onToggle={() => toggle("who")}>
          <GroupLabel>{t("who.group")}</GroupLabel>
          <div>
            <TextRow
              label={t("who.name")}
              value={s.name}
              onChange={(v) => set("name", v.replace(/\s/g, ""))}
              placeholder={t("who.nameHint")}
              maxLength={30}
            />
            <TextRow
              label={t("who.age")}
              value={s.age}
              onChange={(v) => set("age", v.replace(/\D/g, ""))}
              placeholder={t("add")}
              numeric
              maxLength={3}
            />
            {tooYoung && (
              <p className="pt-1.5 text-[12px] text-slate">{t("who.youngSoon", { age: minAge })}</p>
            )}
            <PickRow
              label={t("who.gender")}
              shown={t(`genders.${s.gender}`)}
              empty={t("add")}
              choices={[...GENDERS]
                .sort((a, b) => Number(isSoon(a)) - Number(isSoon(b)))
                .map((g) => {
                  const soon = isSoon(g);
                  return {
                    value: g,
                    label: soon ? t("who.soon", { label: t(`genders.${g}`) }) : t(`genders.${g}`),
                    disabled: soon,
                  };
                })}
              selected={[s.gender]}
              onPick={(g) => set("gender", g as Gender)}
            />
            <PickRow
              label={t("who.yourRole")}
              shown={s.yourRole}
              empty={t("add")}
              choices={roleChoices.map((r) => ({ value: r, label: r }))}
              selected={[s.yourRole]}
              onPick={(r) => set("yourRole", r)}
              addLabel={t("addOwn")}
              addPlaceholder={t("addPlaceholder")}
            />
            <PickRow
              label={who ? t("who.relation", { name: who }) : t("who.relationFallback")}
              shown={relationLabel(s.relation)}
              empty={t("add")}
              choices={relationChoices.map((r) => ({ value: r, label: relationLabel(r) }))}
              selected={[s.relation]}
              onPick={(r) => set("relation", r.toLowerCase())}
              addLabel={t("addOwn")}
              addPlaceholder={t("addPlaceholder")}
            />
          </div>
        </Fold>

        <Fold
          num="03"
          title={t("what.title")}
          summary={t("what.summary")}
          open={open.what}
          onToggle={() => toggle("what")}
        >
          <div>
            <TextRow
              label={t("what.about")}
              value={s.about}
              onChange={(v) => set("about", v)}
              placeholder={t("add")}
              maxLength={500}
            />
            <TextRow
              label={t("what.goal")}
              value={s.goal}
              onChange={(v) => set("goal", v)}
              placeholder={t("add")}
              maxLength={500}
            />
            <PickRow
              label={who ? t("what.reaction", { name: who }) : t("what.reactionFallback")}
              shown={s.reaction ? t(`reactions.${s.reaction}`) : ""}
              empty={t("what.reactionNone")}
              choices={REACTIONS.map((r) => ({ value: r, label: t(`reactions.${r}`) }))}
              selected={[s.reaction]}
              onPick={(r) => set("reaction", r === s.reaction ? "" : r)}
            />
            <PickRow
              label={t("what.difficulty")}
              shown={t(`difficulties.${s.difficulty}`)}
              empty={t("add")}
              choices={DIFFICULTIES.map((d) => ({ value: d, label: t(`difficulties.${d}`) }))}
              selected={[s.difficulty]}
              onPick={(d) => set("difficulty", d as ScenarioDraft["difficulty"])}
            />
            {sorted.length > 1 && (
              <PickRow
                label={t("what.voice")}
                shown={chosen?.label ?? ""}
                empty={t("add")}
                choices={sorted.map((v) => ({ value: v.id, label: v.label }))}
                selected={[voice]}
                onPick={(id) => {
                  set("voice", id);
                  play(id);
                }}
              />
            )}
            {sorted.length <= 1 && (
              <div className="flex min-h-[50px] items-center justify-between border-b border-hairline">
                <span className="text-[14.5px] text-slate">{t("what.voice")}</span>
                {chosen ? (
                  <button
                    type="button"
                    onClick={() => play(chosen.id)}
                    aria-label={t("what.listen", { label: chosen.label })}
                    className="rounded-full border border-line px-3 py-1 text-[12.5px] text-bronze-deep hover:text-ink"
                  >
                    ▶ {chosen.label}
                  </button>
                ) : (
                  <span className="text-[14px] text-slate">{t("what.subtitles")}</span>
                )}
              </div>
            )}
          </div>
        </Fold>
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-3 bg-gradient-to-t from-paper from-75% to-transparent pt-8 pb-1">
        {!consented && <ConsentCheck checked={consent} onChange={setConsent} />}
        {error && (
          <p role="alert" className="text-center text-[13px] text-danger">
            {error}
          </p>
        )}
        <PrimaryButton onClick={() => onStart({ ...s, voice }, me, consent)} disabled={!ready}>
          {busy ? t("starting") : t("start")}
        </PrimaryButton>
      </div>
    </div>
  );
}
