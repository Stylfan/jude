# Voices

Mistral has no preset Danish voices. Each voice in Jude is cloned from a
short recording of a real person, so every voice needs that person's
written consent first.

## The recording

- 20 to 40 seconds of one person speaking Danish, in a quiet room, at
  their normal pace and warmth. No music, no other voices.
- MP3 or WAV. A phone's voice memo app is fine.
- The text below works well; it has the range of a conversation.

> Hej. Godt, at vi fik sat tid af til at tale sammen. Jeg har tænkt en
> del over det, du sagde sidst, og jeg er ikke sikker på, at jeg er enig.
> Men jeg vil gerne forstå det. Kan du fortælle mig lidt mere om, hvordan
> du ser det? Det betyder noget for mig, at vi finder ud af det her
> sammen.

## The consent (to be signed before recording)

> Jeg, [fulde navn], giver Lenskjold Consulting lov til at bruge en
> optagelse af min stemme til at lave en syntetisk stemme hos Mistral AI.
> Stemmen bruges i øvelsesværktøjet Jude, hvor den læser en rolle i
> øvelsessamtaler. Den bruges ikke til noget andet, og den bliver ikke
> præsenteret som mig. Jeg kan når som helst trække samtykket tilbage ved
> at skrive til [e-mail]; så slettes stemmen hos Mistral og i Jude inden
> for 14 dage.
>
> Dato og underskrift:

Keep the signed consent with the operator, not in this repository.

## Making the voice

1. In Mistral's console (AI Studio), under Audio, create a voice from the
   recording, tagged Danish (`da`). Set the retention to the longest
   allowed, or re-create it before it lapses.
2. Copy the voice's id.
3. Add it to `JUDE_VOICES` on the server as one JSON array:

```json
[
  {
    "id": "rolig-kvinde",
    "label": "Rolig",
    "gender": "kvinde",
    "ageMin": 40,
    "ageMax": 70,
    "voiceId": "<the id from Mistral>"
  }
]
```

`id` is Jude's own short name (lower case, digits and hyphens), `label`
is what the set-up shows, and `gender`, `ageMin` and `ageMax` decide
which voices are suggested first for the person you talk to.

## The list

| Jude id    | Label | Gender | Ages  | Speaker                  | Consent signed | Created at Mistral |
| ---------- | ----- | ------ | ----- | ------------------------ | -------------- | ------------------ |
| rolig-mand | Rolig | mand   | 18–75 | The operator (own voice) | Not needed     | 2026-11-13         |
