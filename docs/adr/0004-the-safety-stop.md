# ADR 0004 — The safety stop

Date: 2026-11-12. Status: accepted.

## Context

People will rehearse conversations about grief, conflict and breakups.
Now and then what someone says will point to a real risk to themselves
or others. The product owner's rule: the product must never go on when
someone is at risk of harming themselves or others. Never.

## Decision

Three independent signals; any one ends the conversation
(`src/domain/safety.ts`, `src/services/conversation.ts`):

1. Mistral's moderation scores for what the person said: `selfharm` or
   `violence_and_threats` at 0.5 or more.
2. Danish words and phrases checked in our own code, with punctuation
   ignored, so the stop does not depend on a model alone.
3. The role prompt tells the model to answer only with a marker when it
   senses risk; the marker is never shown or spoken.

Both of the first checks run before the chat model sees the turn. If the
moderation call fails, the turn fails: it does not go on unchecked.

On a stop, the page shows a calm card with Livslinien (70 201 201) and
112, with only a way out. The ticket is marked stopped, and the server
refuses any further turn or feedback for that conversation. Nothing about
it is stored.

## Trade-off accepted

The rule leans towards stopping. A rehearsal that only mentions such
words ("he said he'd kill himself if I left") is stopped too. A false
stop costs a rehearsal; a missed one could cost far more.
