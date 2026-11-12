# ADR 0005 — Jude does not work offline

Date: 2026-11-12. Status: accepted.

## Context

Haij's second rule asks that everything essential works offline, as
Prismatic does. Jude's essential parts are Danish speech to text, a
model that plays the other person, a voice and the feedback. All four
need a language or speech model.

## Decision

Jude uses Mistral's API in the EU for all four (ADR 0003) and does not
work without a network connection to it. No other provider is offered.
Everything else (accounts, the profile, the ceilings, the safety word
check) runs on the installation's own server.

## Trade-off accepted

Mistral sees every conversation while it happens (`docs/subprocessors.md`).
Running the open models on one's own server would avoid that, but needs a
server with a graphics card, and the open weights of Voxtral TTS are
licensed for non-commercial use only. The same exception is made for
Distil.
