# ADR 0003 — Mistral for speech and the model, with ceilings on cost

Date: 2026-11-12. Status: accepted.

## Context

The AI must be EU-hosted. A public demo must not be able to run up the
bill.

## Decision

- Mistral's API, called with plain `fetch` (`src/services/mistral.ts`):
  Voxtral for Danish transcription, the chat model for the role and the
  feedback, Voxtral TTS for the voice, and the moderation model for the
  safety stop. All model ids can be set in the environment.
- Push to talk, one turn at a time: the browser records, turns the
  recording into a 16 kHz WAV (`src/lib/wav.ts`), and sends it. Simpler
  and cheaper than streaming, and Danish file transcription is supported.
- Danish has no preset voices at Mistral. Voices are cloned from
  recordings made with written consent and configured in `JUDE_VOICES`
  (`docs/voices.md`). Without voices, the other person answers in
  subtitles.
- Ceilings (`src/domain/limits.ts`), all settable: minutes and turns per
  conversation, characters per field and per turn, seconds of audio per
  turn, and per day both per account and for the whole server
  (conversations, turns, characters). The database function
  `charge_usage()` checks and counts in one locked step; the server's
  count is not tied to an account, so deleting demo visits does not open
  the ceiling again.
- A voice preview uses a fixed sentence and is cached in memory per
  voice, so playing it costs nothing after the first time.

## Trade-off accepted

A turn takes a few seconds (record, upload, transcribe, answer, speak),
so the conversation is less fluid than a phone call. Streaming can come
later. The ceilings stop a real person too when the demo is busy; the
page says so plainly.
