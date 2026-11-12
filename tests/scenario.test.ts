import { describe, expect, it } from "vitest";
import { capTurn } from "@/domain/conversation";
import { feedbackMessages, rolePrompt } from "@/domain/prompts";
import { STOP_MARKER } from "@/domain/safety";
import { containsIdentifiers, hasContext, scenarioSchema } from "@/domain/scenario";
import { pickVoice, publicVoices, readVoices, voicesFor } from "@/domain/voices";

const schema = scenarioSchema(500);
const lone = {
  yourRole: "Leder",
  name: "Lone",
  age: "58",
  gender: "kvinde",
  relation: "medarbejder",
  about: "Hendes opgaver flyttes til et nyt team",
  goal: "At hun føler sig hørt",
  reaction: "lukker i",
  difficulty: "middel",
  voice: "",
};

describe("the set-up", () => {
  it("takes a first name, never a surname", () => {
    expect(schema.safeParse(lone).success).toBe(true);
    expect(schema.safeParse({ ...lone, name: "Anne-Mette" }).success).toBe(true);
    expect(schema.safeParse({ ...lone, name: "Lone Hansen" }).success).toBe(false);
  });

  it("refuses e-mail addresses, phone and CPR numbers in the free text", () => {
    expect(containsIdentifiers("skriv til lone@firma.dk")).toBe(true);
    expect(containsIdentifiers("ring på 20 30 40 50")).toBe(true);
    expect(containsIdentifiers("010203-1234")).toBe(true);
    expect(containsIdentifiers("Hun har været her i 12 år")).toBe(false);
    expect(schema.safeParse({ ...lone, about: "Hun hedder lone@firma.dk" }).success).toBe(false);
  });

  it("can skip the context and still be a set-up", () => {
    const s = schema.parse({ ...lone, about: "", goal: "", reaction: "" });
    expect(hasContext(s)).toBe(false);
    expect(rolePrompt(s, null)).toContain("Der er ingen beskrivelse af emnet");
  });

  it("puts the role, the context and the safety rule in the prompt", () => {
    const s = schema.parse(lone);
    const prompt = rolePrompt(s, { firstName: "Stef", age: 50, improve: "" });
    expect(prompt).toContain("Du er Lone, 58 år");
    expect(prompt).toContain("Hendes opgaver flyttes");
    expect(prompt).toContain("Vedkommende hedder Stef");
    expect(prompt).toContain(STOP_MARKER);
  });

  it("gives the feedback prompt the goal and what to get better at", () => {
    const s = schema.parse(lone);
    const [system] = feedbackMessages(
      s,
      { firstName: "", age: null, improve: "at holde fast" },
      [],
    );
    expect(system!.content).toContain("At hun føler sig hørt");
    expect(system!.content).toContain("at holde fast");
  });

  it("cuts a long turn at a word", () => {
    expect(capTurn("en  to   tre fire", 8)).toBe("en to");
    expect(capTurn("  kort  ", 100)).toBe("kort");
  });
});

describe("voices", () => {
  const env = {
    JUDE_VOICES: JSON.stringify([
      { id: "ung-mand", label: "Ung", gender: "mand", ageMin: 15, ageMax: 30, voiceId: "v1" },
      {
        id: "rolig-kvinde",
        label: "Rolig",
        gender: "kvinde",
        ageMin: 40,
        ageMax: 70,
        voiceId: "v2",
      },
      { id: "broken", label: "", gender: "mand", ageMin: 1, ageMax: 2, voiceId: "v3" },
    ]),
  };

  it("read only well-formed voices and never hand the Mistral id to the page", () => {
    const voices = readVoices(env);
    expect(voices.map((v) => v.id)).toEqual(["ung-mand", "rolig-kvinde"]);
    expect(JSON.stringify(publicVoices(voices))).not.toContain("v2");
    expect(readVoices({ JUDE_VOICES: "not json" })).toEqual([]);
  });

  it("put the voices that fit the person first", () => {
    const voices = publicVoices(readVoices(env));
    expect(voicesFor(voices, "kvinde", 58)[0]!.id).toBe("rolig-kvinde");
    expect(voicesFor(voices, "mand", 16)[0]!.id).toBe("ung-mand");
    expect(pickVoice(readVoices(env), "", "kvinde", 58)?.voiceId).toBe("v2");
    expect(pickVoice([], "", "kvinde", 58)).toBeNull();
  });
});
