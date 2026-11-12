import { describe, expect, it } from "vitest";
import {
  MODERATION_THRESHOLD,
  STOP_MARKER,
  checkUserTurn,
  crisisInWords,
  replyAsksToStop,
} from "@/domain/safety";

/**
 * The safety stop leans towards stopping: Danish words about suicide,
 * self-harm or harming someone, or a high moderation score, end the
 * conversation, and so does the model's marker.
 */

describe("the safety stop", () => {
  it("stops on Danish words about suicide or self-harm", () => {
    for (const said of [
      "Jeg har tænkt på selvmord",
      "Nogle gange vil jeg bare TAGE MIT EGET LIV",
      "jeg har lyst til at skade mig selv",
      "Jeg orker ikke at leve mere",
    ]) {
      expect(crisisInWords(said)).toBe(true);
    }
  });

  it("stops on threats to harm someone", () => {
    expect(crisisInWords("Hvis han gør det igen, så slår jeg ham ihjel")).toBe(true);
    expect(crisisInWords("Jeg kunne dræbe hende.")).toBe(true);
    expect(crisisInWords("Selvmord?")).toBe(true);
    expect(crisisInWords("Så slår jeg ham ihjel.")).toBe(true);
  });

  it("goes on with an ordinary hard conversation", () => {
    for (const said of [
      "Du har stukket mig en kniv i ryggen",
      "Det her er dødsvigtigt for teamet",
      "Jeg er virkelig vred på dig",
      "Vi skal tale om, at du ofte kommer for sent",
    ]) {
      expect(checkUserTurn(said, { selfharm: 0.01, violence_and_threats: 0.1 })).toBeNull();
    }
  });

  it("stops on a high moderation score in a crisis category, and names why", () => {
    expect(checkUserTurn("…", { selfharm: MODERATION_THRESHOLD })).toBe("moderation");
    expect(checkUserTurn("…", { violence_and_threats: 0.9 })).toBe("moderation");
    expect(checkUserTurn("…", { sexual: 0.9 })).toBeNull();
    expect(checkUserTurn("selvmord", null)).toBe("words");
  });

  it("stops when the model answers with the marker", () => {
    expect(replyAsksToStop(STOP_MARKER)).toBe(true);
    expect(replyAsksToStop(`Øh. ${STOP_MARKER}`)).toBe(true);
    expect(replyAsksToStop("Hvorfor siger du det?")).toBe(false);
  });
});
