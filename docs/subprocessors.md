# Who can see what

This page lists every third party that can see data in a Jude
installation. A new third party appears here before it appears in the
software.

## What Jude stores: very little

The database holds accounts, the profile (first name, age, roles, what
to get better at), its audit log, and the number of conversations and
turns per day. It never holds a conversation: not the set-up, the words,
the audio or the feedback (ADR 0002).

## Mistral AI: every conversation, as it happens

| What Mistral sees                                                                 | Why                                      |
| --------------------------------------------------------------------------------- | ---------------------------------------- |
| The recording of each turn                                                        | Danish speech to text (Voxtral)          |
| What the person said, as text                                                     | The moderation check for the safety stop |
| The set-up, the first name and what to get better at, and the conversation so far | The model playing the other person       |
| The other person's reply                                                          | Speech in the chosen voice (Voxtral TTS) |
| The whole conversation at the end                                                 | The feedback                             |
| The recordings the voices are cloned from                                         | Making the voices (docs/voices.md)       |

Mistral AI is a French company. Its API is served from the EU. By its
terms for the API it keeps requests for up to 30 days to detect abuse,
and on a paid plan it does not use them to train its models. Its data
processing agreement is part of those terms, so there is nothing
separate to sign. Check Mistral's current terms before going live and
run the installation on a paid plan; the privacy policy in
`messages/da.json` repeats these points and must stay true.

Before the first conversation, each person reads what Mistral receives,
is asked to leave out sensitive and identifying details, and says yes
(`src/components/conversation/consent-card.tsx`). The server refuses to
start a conversation without that yes.

## Where you run it

| Who                   | What they can see                                      |
| --------------------- | ------------------------------------------------------ |
| Your hosting provider | Everything stored on the server, and the traffic to it |
| Your backup storage   | The database backups                                   |

Choose an EU-owned provider on EU soil. The demo runs at Hetzner in
Germany.

## Nothing else

No analytics, no telemetry, no error reporting, no fonts or scripts from a
CDN (the typeface is in the repository). Next.js telemetry is switched off
in the Docker image (`NEXT_TELEMETRY_DISABLED=1`).

## Passkeys and authenticator apps: on your own devices

A passkey's private key stays with the device that made it, and so does
the secret in an authenticator app. Jude never sends them anything.

## The code: GitHub

The source code is hosted on GitHub (Microsoft, United States). GitHub
hosts code, never the data of an installation.
