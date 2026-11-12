import type { Ai } from "./mistral";

/**
 * A stand-in for Mistral on a development machine, so the screens can be
 * tried without a key: JUDE_FAKE_AI=on, and never when NODE_ENV is
 * production. It does not listen; it plays a short scripted conversation.
 */

export function fakeAiAllowed(env: Record<string, string | undefined> = process.env): boolean {
  return env.JUDE_FAKE_AI === "on" && env.NODE_ENV !== "production";
}

const YOU = [
  "Tak fordi du har tid. Jeg vil gerne tale om den nye teamstruktur.",
  "Dine opgaver med kontrakterne flytter til det nye team fra januar.",
  "Det forstår jeg godt, at du spørger om. Hvad tænker du lige nu?",
  "Du skal stå for introduktionen af de nye kolleger.",
];
const OTHER = [
  "Det lyder ikke godt. Er det mig, der skal flyttes?",
  "Jeg har lavet det arbejde i tolv år. Hvorfor hører jeg det først nu?",
  "At ingen spurgte mig. Men okay. Hvad skal jeg så lave?",
  "Det kan jeg godt se meningen med. Lad os tale om det på fredag.",
];

let turn = 0;

export function fakeAi(): Ai {
  return {
    async transcribe() {
      return YOU[turn % YOU.length]!;
    },
    async moderate() {
      return {};
    },
    async chat(messages, options) {
      await new Promise((r) => setTimeout(r, 700));
      if (options?.json) {
        return JSON.stringify({
          scores: { klarhed: 4, empati: 3, lytning: 4, fasthed: 3 },
          moments: [
            { kind: "good", quote: YOU[1], why: "Klart og konkret, uden at pakke beskeden ind." },
            {
              kind: "good",
              quote: YOU[2],
              why: "Du gav plads i stedet for at forsvare beslutningen.",
            },
            {
              kind: "try",
              quote: YOU[0],
              why: "Sig, at det er en svær besked, før hun selv skal gætte det.",
            },
          ],
        });
      }
      void messages;
      return OTHER[turn++ % OTHER.length]!;
    },
    async speak() {
      throw new Error("the stand-in has no voice");
    },
  };
}
