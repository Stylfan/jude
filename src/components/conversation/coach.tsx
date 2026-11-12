"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PublicVoice } from "@/domain/voices";
import { Wordmark } from "@/components/ui/wordmark";
import { ConsentCard } from "./consent-card";
import { CrisisCard } from "./crisis-card";
import { FeedbackView } from "./feedback-view";
import { Setup } from "./setup";
import { Talk } from "./talk";
import {
  postJson,
  type ApiError,
  type LimitWhich,
  type ScenarioDraft,
  type Started,
  type Turn,
} from "./types";

/**
 * Jude's one screen: the yes before the first conversation, then set-up,
 * conversation, feedback, and the safety stop. Everything about the conversation lives in this
 * component's state and is gone when the page closes or a new one starts.
 */

type State =
  | { screen: "consent" }
  | { screen: "setup"; step: number }
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
  consented,
  roles,
  voices,
  secondsPerTurn,
}: {
  consented: boolean;
  roles: string[];
  voices: PublicVoice[];
  secondsPerTurn: number;
}) {
  const t = useTranslations("talk");
  const tl = useTranslations("limits");
  const te = useTranslations("errors");
  const ts = useTranslations("setup");
  const tn = useTranslations("nav");
  const [state, setState] = useState<State>(
    consented ? { screen: "setup", step: 0 } : { screen: "consent" },
  );
  // A new key gives a new, empty set-up after "Ny samtale".
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const again = () => {
    setRound((r) => r + 1);
    setError(null);
    setState({ screen: "setup", step: 0 });
  };

  const start = async (scenario: ScenarioDraft, next: boolean) => {
    setError(null);
    if (state.screen !== "setup") return;
    if (next) {
      setState({ screen: "setup", step: state.step + 1 });
      return;
    }
    setBusy(true);
    const answer = await postJson<Started | { error: ApiError; which?: LimitWhich }>(
      "/api/conversation/start",
      { scenario },
    );
    setBusy(false);
    if ("error" in answer) {
      if (answer.error === "limit") setError(tl(answer.which === "server" ? "server" : "account"));
      else setError(answer.error === "invalid" ? ts("errors.invalid") : te(answer.error));
      return;
    }
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
      {(state.screen === "consent" || (state.screen === "setup" && state.step === 0)) && (
        <div className="-mt-1 mb-3 flex items-center justify-between">
          <span className="text-ink">
            <Wordmark />
          </span>
          <Link href="/profil" className="py-1.5 text-[13px] text-slate hover:text-ink">
            {tn("profile")}
          </Link>
        </div>
      )}
      {state.screen === "consent" && (
        <ConsentCard onAccept={() => setState({ screen: "setup", step: 0 })} />
      )}
      {state.screen === "setup" && (
        <Setup
          key={round}
          roles={roles}
          voices={voices}
          step={state.step}
          busy={busy}
          error={error}
          onBack={() => setState({ screen: "setup", step: Math.max(0, state.step - 1) })}
          onStart={(s, next) => void start(s, next)}
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
