"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PublicVoice } from "@/domain/voices";
import { Wordmark } from "@/components/ui/wordmark";
import { saveProfileAction } from "@/actions/profile";
import { unlockAudio } from "@/lib/audio-unlock";
import { CrisisCard } from "./crisis-card";
import { FeedbackView } from "./feedback-view";
import { Setup } from "./setup";
import { Talk } from "./talk";
import {
  postJson,
  type ApiError,
  type LimitWhich,
  type ProfileDraft,
  type ScenarioDraft,
  type Started,
  type Turn,
} from "./types";

/**
 * Jude's one screen: the front page (about you, who you talk to, what
 * about, and the consent the first time), the conversation, feedback, and
 * the safety stop. Everything about the conversation lives in this
 * component's state and is gone when the page closes or a new one starts.
 */

type State =
  | { screen: "setup" }
  | { screen: "talk"; scenario: ScenarioDraft; started: Started }
  | {
      screen: "feedback";
      scenario: ScenarioDraft;
      history: Turn[];
      ticket: string;
      notice?: string;
    }
  | { screen: "crisis" };

export function Coach({
  consented: consentedBefore,
  profile,
  voices,
  secondsPerTurn,
}: {
  consented: boolean;
  profile: ProfileDraft;
  voices: PublicVoice[];
  secondsPerTurn: number;
}) {
  const t = useTranslations("talk");
  const tl = useTranslations("limits");
  const te = useTranslations("errors");
  const ts = useTranslations("setup");
  const tn = useTranslations("nav");
  const tp = useTranslations("setup.errors");
  const [state, setState] = useState<State>({ screen: "setup" });
  const [consented, setConsented] = useState(consentedBefore);
  // What was last saved, so "Start samtalen" saves the profile only when it changed.
  const [saved, setSaved] = useState(profile);
  // A new key gives a new, empty set-up after "Ny samtale".
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const again = () => {
    setRound((r) => r + 1);
    setError(null);
    setState({ screen: "setup" });
  };

  const start = async (scenario: ScenarioDraft, me: ProfileDraft, consent: boolean) => {
    setError(null);
    if (state.screen !== "setup") return;
    // This tap is what lets a phone play the voice and hear the microphone.
    unlockAudio();
    setBusy(true);
    if (JSON.stringify(me) !== JSON.stringify(saved)) {
      const result = await saveProfileAction({
        firstName: me.firstName.trim(),
        age: me.age ? Number(me.age) : null,
        roles: me.roles,
        improve: me.improve,
      });
      if (!result.ok) {
        setBusy(false);
        setError(tp("invalid"));
        return;
      }
      setSaved(me);
    }
    const answer = await postJson<Started | { error: ApiError; which?: LimitWhich }>(
      "/api/conversation/start",
      { scenario, consent },
    );
    setBusy(false);
    if ("error" in answer) {
      if (answer.error === "limit") setError(tl(answer.which === "server" ? "server" : "account"));
      else setError(answer.error === "invalid" ? ts("errors.invalid") : te(answer.error));
      return;
    }
    setConsented(true);
    setState({ screen: "talk", scenario, started: answer });
  };

  const limitReached = (
    which: LimitWhich,
    scenario: ScenarioDraft,
    history: Turn[],
    ticket: string,
  ) => {
    const notice =
      which === "time"
        ? t("timeUp")
        : which === "turns"
          ? t("turnsUp")
          : tl(which === "server" ? "server" : "account");
    setState({ screen: "feedback", scenario, history, ticket, notice });
  };

  return (
    <main id="content" className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-6 pt-5 pb-7">
      {state.screen === "setup" && (
        <div className="-mt-1 mb-3 flex items-center justify-between">
          <span className="text-ink">
            <Wordmark />
          </span>
          <Link href="/account" className="py-1.5 text-[13px] text-slate hover:text-ink">
            {tn("account")}
          </Link>
        </div>
      )}
      {state.screen === "setup" && (
        <Setup
          key={round}
          profile={saved}
          voices={voices}
          consented={consented}
          busy={busy}
          error={error}
          onStart={(s, me, consent) => void start(s, me, consent)}
        />
      )}
      {state.screen === "talk" && (
        <Talk
          scenario={state.scenario}
          ticket={state.started.ticket}
          minutes={state.started.minutes}
          secondsPerTurn={secondsPerTurn}
          onEnd={(history, ticket) =>
            setState({ screen: "feedback", scenario: state.scenario, history, ticket })
          }
          onLimit={(which, history, ticket) => limitReached(which, state.scenario, history, ticket)}
          onCrisis={() => setState({ screen: "crisis" })}
          autoStart
        />
      )}
      {state.screen === "feedback" && (
        <FeedbackView
          scenario={state.scenario}
          history={state.history}
          ticket={state.ticket}
          notice={state.notice}
          onAgain={again}
        />
      )}
      {state.screen === "crisis" && <CrisisCard onClose={again} />}
    </main>
  );
}
