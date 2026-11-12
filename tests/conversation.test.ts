import { describe, expect, it } from "vitest";
import { parseFeedback } from "@/domain/feedback";
import { STOP_MARKER } from "@/domain/safety";
import { scenarioSchema } from "@/domain/scenario";
import type { Turn } from "@/domain/conversation";
import { giveFeedback, takeTurn } from "@/services/conversation";
import type { Ai } from "@/services/mistral";

/**
 * A turn and the feedback, with a stand-in for Mistral. The stand-in
 * records what reached the chat model, so the tests can show that a
 * crisis turn never gets that far.
 */

const scenario = scenarioSchema(500).parse({
  yourRole: "Leder",
  name: "Lone",
  age: 58,
  gender: "kvinde",
  relation: "medarbejder",
});

function fakeAi(said: string, reply: string, scores: Record<string, number> = {}) {
  const calls = { chat: 0, speak: 0 };
  const ai: Ai = {
    transcribe: async () => said,
    moderate: async () => scores,
    chat: async () => {
      calls.chat++;
      return reply;
    },
    speak: async () => {
      calls.speak++;
      return new Uint8Array([1, 2, 3]);
    },
  };
  return { ai, calls };
}

const base = { scenario, me: null, history: [], audio: new Uint8Array(), maxChars: 1200 };
const voice = {
  id: "v",
  label: "V",
  gender: "kvinde" as const,
  ageMin: 1,
  ageMax: 99,
  voiceId: "x",
};

describe("a turn", () => {
  it("answers in role, with speech when there is a voice", async () => {
    const { ai, calls } = fakeAi("Vi skal tale om teamet.", "Er det mig, der skal flyttes?");
    const r = await takeTurn(ai, { ...base, voice });
    expect(r).toMatchObject({
      kind: "reply",
      you: "Vi skal tale om teamet.",
      other: "Er det mig, der skal flyttes?",
    });
    expect(calls.speak).toBe(1);
  });

  it("answers with the subtitle alone when there is no voice", async () => {
    const { ai, calls } = fakeAi("Hej Lone.", "Hej.");
    const r = await takeTurn(ai, { ...base, voice: null });
    expect(r).toMatchObject({ kind: "reply", audio: null });
    expect(calls.speak).toBe(0);
  });

  it("stops before the model hears a crisis, and never speaks it", async () => {
    const { ai, calls } = fakeAi("Jeg tænker på selvmord", "…");
    expect(await takeTurn(ai, { ...base, voice })).toEqual({ kind: "stop", reason: "words" });
    expect(calls.chat).toBe(0);
    const flagged = fakeAi("…", "…", { selfharm: 0.97 });
    expect(await takeTurn(flagged.ai, { ...base, voice })).toEqual({
      kind: "stop",
      reason: "moderation",
    });
    expect(flagged.calls.chat).toBe(0);
  });

  it("stops when the model asks to, and the marker is never spoken", async () => {
    const { ai, calls } = fakeAi("Jeg kan ikke mere", STOP_MARKER);
    expect(await takeTurn(ai, { ...base, voice })).toEqual({ kind: "stop", reason: "model" });
    expect(calls.speak).toBe(0);
  });

  it("says nothing was heard when the recording was silent", async () => {
    const { ai, calls } = fakeAi("   ", "…");
    expect(await takeTurn(ai, { ...base, voice })).toEqual({ kind: "empty" });
    expect(calls.chat).toBe(0);
  });

  it("does not go on when moderation cannot be reached", async () => {
    const { ai, calls } = fakeAi("Hej", "Hej");
    ai.moderate = async () => {
      throw new Error("down");
    };
    await expect(takeTurn(ai, { ...base, voice })).rejects.toThrow("down");
    expect(calls.chat).toBe(0);
  });
});

const history: Turn[] = [
  { who: "you", text: "Tak fordi du har tid, Lone." },
  { who: "other", text: "Det lyder ikke godt." },
  { who: "you", text: "Dine kontraktopgaver flytter til det nye team fra januar." },
  { who: "other", text: "Hvorfor hører jeg det først nu?" },
];

describe("feedback", () => {
  const good = JSON.stringify({
    scores: { klarhed: 4, empati: 3, lytning: "4", fasthed: 3 },
    moments: [
      {
        kind: "good",
        quote: "“Dine kontraktopgaver flytter til det nye team fra januar.”",
        why: "Klart.",
      },
      { kind: "try", quote: "Tak fordi du har tid", why: "Sig, at det er svært." },
      { kind: "good", quote: "Det lyder ikke godt.", why: "Lone sagde det, ikke du." },
      { kind: "good", quote: "Noget, du aldrig sagde", why: "Opfundet." },
    ],
  });

  it("keeps only moments quoting what the person said", () => {
    const f = parseFeedback("```json\n" + good + "\n```", history);
    expect(f?.scores).toEqual({ klarhed: 4, empati: 3, lytning: 4, fasthed: 3 });
    expect(f?.moments.map((m) => m.quote)).toEqual([
      "Dine kontraktopgaver flytter til det nye team fra januar.",
      "Tak fordi du har tid",
    ]);
  });

  it("refuses scores outside 1 to 5 or an answer that is not JSON", () => {
    expect(parseFeedback(good.replace('"klarhed":4', '"klarhed":7'), history)).toBeNull();
    expect(parseFeedback("Godt klaret!", history)).toBeNull();
  });

  it("asks the model once more when the first answer is unusable", async () => {
    const answers = ["ikke json", good];
    const ai = { ...fakeAi("", "").ai, chat: async () => answers.shift()! };
    expect((await giveFeedback(ai, { scenario, me: null, history })).kind).toBe("feedback");
  });

  it("gives no feedback on a conversation too short to judge", async () => {
    const { ai, calls } = fakeAi("", good);
    expect(await giveFeedback(ai, { scenario, me: null, history: history.slice(0, 1) })).toEqual({
      kind: "tooShort",
    });
    expect(calls.chat).toBe(0);
  });
});
