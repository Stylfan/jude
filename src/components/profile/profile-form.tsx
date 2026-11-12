"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { saveProfileAction } from "@/actions/profile";
import {
  Field,
  PrimaryButton,
  QuietButton,
  Select,
  TextInput,
} from "@/components/conversation/fields";
import { Wordmark } from "@/components/ui/wordmark";
import type { ProfileRole } from "@/db/schema";

/**
 * The profile, in the same quiet column as the conversation: first name,
 * age, your roles at work and in private, and what you want to get better
 * at. Roles are added and removed where they stand.
 */

type Initial = { firstName: string; age: number | null; roles: ProfileRole[]; improve: string };

export function ProfileForm({ first, initial }: { first: boolean; initial: Initial }) {
  const t = useTranslations("profile");
  const tn = useTranslations("nav");
  const te = useTranslations("errors");
  const router = useRouter();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [age, setAge] = useState(initial.age === null ? "" : String(initial.age));
  const [roles, setRoles] = useState<ProfileRole[]>(initial.roles);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<ProfileRole["kind"]>("work");
  const [improve, setImprove] = useState(initial.improve);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRole = () => {
    const l = label.trim();
    if (!l || roles.some((r) => r.label.toLowerCase() === l.toLowerCase())) return;
    setRoles([...roles, { label: l.charAt(0).toUpperCase() + l.slice(1), kind }]);
    setLabel("");
  };

  const save = async (skip: boolean) => {
    setBusy(true);
    setError(null);
    const input = skip
      ? { firstName: "", age: null, roles: [], improve: "" }
      : { firstName: firstName.trim(), age: age ? Number(age) : null, roles, improve };
    const result = await saveProfileAction(input);
    setBusy(false);
    if (!result.ok) {
      setError(te(result.error));
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <main id="content" className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-6 pt-5 pb-7">
      <div className="-mt-1 mb-3 flex items-center justify-between">
        <Link href="/" className="text-ink" aria-label={tn("conversation")}>
          <Wordmark />
        </Link>
        {!first && (
          <Link href="/account" className="py-1.5 text-[13px] text-slate hover:text-ink">
            {tn("account")}
          </Link>
        )}
      </div>

      <h1 className="mt-7 mb-2 text-[26px] leading-tight font-normal">{t("title")}</h1>
      <p className="mb-6 text-[13.5px] leading-relaxed text-slate">{t("lead")}</p>

      <div className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <Field label={t("firstName")} hint={t("firstNameHint")} htmlFor="first-name">
            <TextInput
              id="first-name"
              autoComplete="given-name"
              maxLength={30}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value.replace(/\s/g, ""))}
            />
          </Field>
          <Field label={t("age")} htmlFor="my-age">
            <TextInput
              id="my-age"
              inputMode="numeric"
              maxLength={3}
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] text-slate">{t("roles")}</span>
          {roles.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {roles.map((r) => (
                <li
                  key={r.label}
                  className="flex items-center gap-1 rounded-full border border-line bg-surface py-1 pr-1.5 pl-3 text-[13px]"
                >
                  {r.label}
                  <span className="text-slate">· {t(r.kind)}</span>
                  <button
                    type="button"
                    onClick={() => setRoles(roles.filter((x) => x !== r))}
                    aria-label={t("removeRole", { role: r.label })}
                    className="grid size-6 place-items-center rounded-full text-slate hover:bg-sand hover:text-ink"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-[1fr_112px_auto] gap-2">
            <TextInput
              aria-label={t("roleLabel")}
              placeholder={t("rolesHint")}
              maxLength={40}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRole();
                }
              }}
            />
            <Select
              aria-label={t("roleKind")}
              value={kind}
              onChange={(e) => setKind(e.target.value as ProfileRole["kind"])}
              options={[
                { value: "work", label: t("work") },
                { value: "private", label: t("private") },
              ]}
            />
            <button
              type="button"
              onClick={addRole}
              aria-label={t("addRole")}
              className="grid size-[46px] place-items-center rounded-[10px] border border-line bg-surface text-[20px] text-ink hover:bg-sand/60"
            >
              +
            </button>
          </div>
        </div>

        <Field label={t("improve")} htmlFor="improve">
          <TextInput
            id="improve"
            maxLength={500}
            placeholder={t("improvePlaceholder")}
            value={improve}
            onChange={(e) => setImprove(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-col items-center gap-1.5">
        {error && (
          <p role="alert" className="text-center text-[13px] text-danger">
            {error}
          </p>
        )}
        <PrimaryButton onClick={() => void save(false)} disabled={busy}>
          {t("save")}
        </PrimaryButton>
        {first ? (
          <QuietButton onClick={() => void save(true)} disabled={busy}>
            {t("skip")}
          </QuietButton>
        ) : (
          <span className="h-8" />
        )}
      </div>
    </main>
  );
}
