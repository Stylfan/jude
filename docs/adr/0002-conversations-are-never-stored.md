# ADR 0002 — Conversations are never stored

Date: 2026-11-12. Status: accepted.

## Context

A rehearsal of a hard conversation is personal: a dismissal, a
separation, a son who has stopped talking. The product owner decided
that only what a person types about themselves is kept, and that every
conversation starts fresh.

## Decision

- No table holds conversation content: not the set-up, the transcript,
  the audio or the feedback. The profile (first name, age, roles, what to
  get better at) is the only text a person types that is stored.
- The page keeps the conversation in memory and sends it with each turn.
  The server reads it for the length of one request.
- A signed ticket (`src/domain/ticket.ts`, HMAC with a key derived from
  `JUDE_SECRET`) carries the conversation's start time, its turn count and
  whether it was stopped for safety, but no words. So the server can
  enforce the time limit, the turn limit and the safety stop without
  storing anything, and the page cannot reset them.
- Logs hold the route, the status and the duration; an error is logged by
  its kind only (`src/lib/conversation-api.ts`), never with its message
  body.
- The feedback is offered as a PDF through the browser's print, so it
  leaves with the person, not with us.

## Trade-off accepted

No history: a person cannot see how they did last week, and nobody can
investigate a complaint about a specific conversation. A page reload ends
the conversation. Mistral, which processes each turn, keeps requests by
its own terms (see `docs/subprocessors.md`); "never stored" is true of
Jude, and the privacy policy says what Mistral does.
