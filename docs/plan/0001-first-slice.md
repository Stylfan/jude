# Plan 0001 — First vertical slice

Goal: one complete spoken conversation, locally, from set-up to feedback,
with the safety stop and the cost ceilings in place from the start. No
accounts and no database yet.

## In the slice

1. **Foundation.** Copy the Prismatic skeleton (Next.js 16, TypeScript
   strict, Tailwind 4, next-intl, Vitest, ESLint, Prettier, Docker
   Compose) without its programme domain. AGPL-3.0 licence, README,
   `docs/subprocessors.md` naming Mistral.
2. **Set-up screen.** The three steps from `design/jude-enkel.html`: who,
   why (skippable), voice. Zod validation and length ceilings on every
   field; a hint that only first names are used.
3. **Conversation screen.** Tap the microphone, speak, tap again. The
   server transcribes with Voxtral (`da`), checks moderation, asks the
   chat model for the other person's reply in role, and speaks it with
   Voxtral TTS. The subtitle and the ring follow. The history lives in the
   browser only.
4. **Safety stop.** A moderation hit or a crisis signal ends the
   conversation and shows the Livslinien and 112 card. It cannot be
   resumed.
5. **Feedback screen.** One call with the whole conversation returns four
   scores and three moments in a fixed JSON shape (zod-checked). "Hent som
   PDF" uses the browser's print to PDF with a print stylesheet (no new
   dependency).
6. **Cost ceilings.** Per visit (signed cookie) and per day for the
   server: conversations, turns, minutes, characters. Defaults: 15
   minutes and 40 turns per conversation, 3 conversations per visit per
   day, 500 characters per field. All in environment variables.
7. **Two voices to start.** One woman and one man, cloned from recordings
   made with consent (see open question below), recorded in
   `docs/voices.md`.

## Not in the slice

Profile and accounts (slice 2), the public demo with 24-hour accounts and
the operator pages (slice 3), deployment to `coach.lenskjoldconsulting.dk`
(after slice 3), more voices, realtime streaming.

## Done when

- A full conversation with Lone works on the phone (390 px) and the
  computer (1280 px), with no errors in the console.
- Domain tests cover the limits, the safety decision, prompt building and
  the feedback shape.
- A grep of the logs after a test conversation finds no conversation
  text.

## Dependencies to approve

None planned beyond the Prismatic skeleton. Mistral is called with plain
`fetch`; audio is recorded with the browser's `MediaRecorder`.

## Voices (decided 2026-11-12)

The product owner asks a woman and a man they know to read a short text
and sign a consent. `docs/voices.md` holds the text to read, the consent
wording and the list of voices. Until the recordings exist, the slice
runs with text subtitles and a clearly marked placeholder voice setting.

Approved by the product owner on 2026-11-12.

## Status (2026-11-12)

At the product owner's word ("byg del 2 og del 3, bare kør"), all three
slices were built in one go:

- Slice 1, the conversation: set-up, push-to-talk turns, safety stop,
  feedback with print to PDF, signed tickets and cost ceilings.
- Slice 2, accounts and the profile: Prismatic's accounts, two-step
  sign-in and passkeys; the profile with forced RLS and audit; export as
  JSON; deleting an account.
- Slice 3, the demo and the server: `JUDE_DEMO=on`, privacy policy and
  terms for Jude and Mistral, Docker Compose on port 3001 beside
  Prismatic, `docs/self-hosting.md` with Coolify steps.

Not yet done: a real Mistral key and the voices (both the product
owner's), a check on a real phone with a real microphone, and
deployment.
