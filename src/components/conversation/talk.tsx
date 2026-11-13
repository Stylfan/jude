"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { sharedPlayer, unlockAudio } from "@/lib/audio-unlock";
import { QuietButton } from "./fields";
import type { ApiError, LimitWhich, ScenarioDraft, Turn } from "./types";
import { useRecorder } from "./use-recorder";

/**
 * The conversation: the other person's initial in a circle with a soft
 * ring while they speak, the subtitle, and the microphone. It starts
 * listening at once ("Start samtalen" was the tap); after that Jude hears when you have finished speaking, answers, and
 * listens again, like a conversation between two people. A tap while
 * listening sends at once; a tap while the other speaks interrupts. The
 * history lives here, in the page, only.
 */

type Phase = "idle" | "listening" | "thinking" | "speaking";

type TurnAnswer =
  | { kind: "reply"; ticket: string; you: string; other: string; audio: string | null }
  | { kind: "empty"; ticket: string }
  | { kind: "stop"; ticket: string }
  | { error: ApiError; which?: LimitWhich };

const MIC = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    className="size-[26px]"
    aria-hidden
  >
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

/** Plays a reply on the conversation's one audio element. */
function playOn(element: HTMLAudioElement, src: string, done: () => void) {
  element.src = src;
  element.onended = done;
  element.onerror = done;
  void element.play().catch(done);
}

export function Talk({
  scenario,
  ticket: firstTicket,
  minutes,
  secondsPerTurn,
  onEnd,
  onCrisis,
  onLimit,
  autoStart,
}: {
  scenario: ScenarioDraft;
  ticket: string;
  minutes: number;
  secondsPerTurn: number;
  onEnd: (history: Turn[], ticket: string) => void;
  onCrisis: () => void;
  onLimit: (which: LimitWhich, history: Turn[], ticket: string) => void;
  /** Listen from the first moment, as when "Start samtalen" was just tapped. */
  autoStart: boolean;
}) {
  const t = useTranslations("talk");
  const te = useTranslations("errors");
  const [phase, setPhase] = useState<Phase>("idle");
  const [history, setHistory] = useState<Turn[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const ticket = useRef(firstTicket);
  const player = useRef<HTMLAudioElement | null>(null);
  // True from the first tap until the conversation ends: Jude listens again after each answer.
  const live = useRef(false);
  const listenNext = useRef<() => void>(() => undefined);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);
  // After "Afslut", an answer still on its way is neither shown nor played.
  const gone = useRef(false);
  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
      player.current?.pause();
    };
  }, []);

  const speak = useCallback((audio: string | null, text: string) => {
    setPhase("speaking");
    const done = () => {
      setPhase((p) => (p === "speaking" ? "idle" : p));
      if (live.current) listenNext.current();
    };
    if (!audio) {
      // No voice configured: the ring follows the subtitle for a reading moment.
      setTimeout(done, Math.min(6000, 1200 + text.length * 45));
      return;
    }
    // The same element every time: Safari lets it play once a tap has started it.
    player.current = sharedPlayer();
    playOn(player.current, `data:audio/mpeg;base64,${audio}`, done);
  }, []);

  const send = useCallback(
    async (wav: Blob | null) => {
      if (!wav) {
        // Nothing was said for a while: wait for a tap instead of listening forever.
        setPhase("idle");
        setNotice(t("paused"));
        return;
      }
      setPhase("thinking");
      const form = new FormData();
      form.append("ticket", ticket.current);
      form.append("scenario", JSON.stringify(scenario));
      form.append("history", JSON.stringify(history));
      form.append("audio", wav, "turn.wav");
      const res = await fetch("/api/conversation/turn", { method: "POST", body: form });
      const answer = (await res.json().catch(() => ({ error: "generic" }))) as TurnAnswer;
      if (gone.current) return;
      if ("error" in answer) {
        setPhase("idle");
        live.current = false;
        if (answer.error === "limit" && answer.which) {
          onLimit(answer.which, history, ticket.current);
        } else if (answer.error === "stopped") {
          onCrisis();
        } else {
          setNotice(answer.error === "tooLong" ? t("tooLong") : te(answer.error));
        }
        return;
      }
      ticket.current = answer.ticket;
      if (answer.kind === "stop") {
        live.current = false;
        player.current?.pause();
        onCrisis();
        return;
      }
      if (answer.kind === "empty") {
        setNotice(t("empty"));
        listenNext.current();
        return;
      }
      setHistory((h) => [
        ...h,
        { who: "you", text: answer.you },
        { who: "other", text: answer.other },
      ]);
      speak(answer.audio, answer.other);
    },
    [history, onCrisis, onLimit, scenario, speak, t, te],
  );

  const recorder = useRecorder(secondsPerTurn, (wav) => void send(wav));

  const listen = useCallback(async () => {
    if (await recorder.listen()) setPhase("listening");
    else {
      live.current = false;
      setPhase("idle");
    }
  }, [recorder]);
  useEffect(() => {
    listenNext.current = () => void listen();
  }, [listen]);

  // Once per conversation, also under React's development double mount.
  const started = useRef(false);
  useEffect(() => {
    if (!autoStart || started.current) return;
    started.current = true;
    live.current = true;
    void listen();
  }, [autoStart, listen]);

  const tap = async () => {
    setNotice(null);
    if (phase === "listening") {
      recorder.send();
      return;
    }
    if (phase === "thinking") return;
    unlockAudio();
    // Speaking: tapping interrupts, as you would in a real conversation.
    player.current?.pause();
    live.current = true;
    await listen();
  };

  const end = () => {
    live.current = false;
    recorder.close();
    player.current?.pause();
    onEnd(history, ticket.current);
  };

  const last = history.at(-1);
  const used = Math.min(minutes, Math.floor((now - startedAt) / 60_000));
  const micError =
    recorder.error === "denied"
      ? t("micDenied")
      : recorder.error === "missing"
        ? t("micMissing")
        : recorder.error
          ? te("generic")
          : null;
  const hint =
    micError ??
    notice ??
    (phase === "listening"
      ? t("listening")
      : phase === "thinking"
        ? t("thinking", { name: scenario.name })
        : "");

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex min-h-8 items-center justify-between text-[13px] text-slate">
        <span>{t("minutes", { used, total: minutes })}</span>
        <QuietButton onClick={end}>{t("end")}</QuietButton>
      </div>

      <div className="flex flex-1 flex-col items-center justify-between pt-8 text-center">
        <div className="flex flex-col items-center gap-3.5">
          <div
            className="jude-ring relative grid size-[132px] place-items-center rounded-full"
            data-speaking={phase === "speaking"}
          >
            <span className="grid size-28 place-items-center rounded-full bg-sand text-[38px] font-light">
              {scenario.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <span>{scenario.name}</span>
        </div>

        <p
          aria-live="polite"
          className="flex min-h-[120px] max-w-[480px] items-center text-[20px] leading-snug sm:max-w-[640px] sm:text-[24px]"
        >
          {last ? last.text : <span className="text-[15px] text-slate">{t("ready")}</span>}
        </p>

        <div className="flex flex-col items-center gap-2.5 pb-2">
          <button
            type="button"
            onClick={() => void tap()}
            disabled={phase === "thinking"}
            aria-label={phase === "listening" ? t("send") : t("start")}
            data-listening={phase === "listening"}
            className={cn(
              "jude-mic grid size-[72px] place-items-center rounded-full text-paper transition-colors disabled:opacity-60",
              phase === "listening" ? "bg-bronze" : "bg-ink hover:bg-ink-soft",
            )}
          >
            {MIC}
          </button>
          <span role="status" className="min-h-5 text-[12.5px] text-slate">
            {hint}
          </span>
        </div>
      </div>
    </div>
  );
}
