# CLAUDE.md — Jude

Jude is an open source (AGPL-3.0) Danish web app for rehearsing a difficult
conversation out loud. You say who you are talking to and why, Jude plays
the other person with a voice of their own, and afterwards you get
feedback on how it went. It is for work and private life alike: an
employee, a colleague, a boss, a son, a partner. Read this file at the
start of every session, and `C:\Users\Stylf\.claude\CLAUDE.md` for how to
work with the product owner.

## Principles

- **A conversation, not a chat.** You speak and listen; the screen shows
  the other person, the subtitle and the microphone. Nothing else competes
  for attention.
- **Calm and minimal.** Phone first; on a computer it is the same screen,
  larger, like a meeting. One filled button per screen. Remove before
  adding.
- **Nothing about the conversation is kept.** Only what you type about
  yourself is stored. Every conversation starts fresh.
- **The AI proposes, the human decides.** Feedback is a suggestion with
  your own sentences as evidence, never a verdict.
- **Safety first.** A conversation that shows a risk of harm to oneself or
  others is stopped and never resumed.
- **Plain words.** The UI says "samtale", "feedback", "sværhedsgrad".

## Product rules (agreed with the product owner, 2026-11-12)

- Profile (stored, deletable, exportable): first name, age, your roles
  (private: far, storebror, partner …; work: stilling), and what you want
  to get better at. Nothing else.
- Set-up per conversation, three steps:
  1. Who: your role, the other person's first name, age, gender and
     relation to you.
  2. Why (can be skipped): what it is about, what you want to achieve, how
     the person usually reacts, difficulty (Let, Middel, Svær).
  3. Voice: a choice of voices that fit the person's gender and age, each
     with a short preview.
- **First names only, never a surname, never anything that identifies a
  real person** (no workplace names, addresses, diagnoses). The form says
  so, and the model is told never to ask for or repeat such details.
- Before the first conversation: a card says that Mistral receives the
  voice, the set-up and the whole conversation, and asks the person to
  leave out sensitive details (health, illness, sexuality, faith,
  politics) and anything identifying. They say yes with the one button;
  the time is stored on the profile, and the server refuses to start a
  conversation without it.
- Conversation: spoken in Danish, the other person answers with voice and
  a subtitle. A visible time limit ("4 af 15 minutter").
- Feedback: four scores of 1–5 (Klarhed, Empati, Lytning, Fasthed), each
  shown as "x af 5", and three moments quoting your own sentences, marked
  "Virkede" or "Prøv i stedet" with one line of why. Downloadable as PDF;
  the screen says the conversation is not saved.
- Crisis: if the conversation points to suicidal thoughts, self-harm or
  violence, the role-play stops calmly, a short card shows Livslinien
  (70 201 201) and 112, and that conversation can never be continued.
- Left out of the first version: history of conversations, other
  languages than Danish, teams and organisations, ready-made templates.

## Architecture

Copied from Prismatic (`C:\Users\Stylf\ClaudeProjekter\prismatic`), not
shared as a package. Adapt, do not import.

- Next.js 16 (App Router), TypeScript strict, Tailwind 4, next-intl with
  Danish messages in `messages/da.json`. Never hardcode UI strings.
- Postgres 16 through node-postgres and Drizzle for the profile and
  accounts only, with forced row-level security, an append-only audit log,
  `delete_account()` and an export, as in Prismatic. **No table ever holds
  conversation content**: no context text, transcript, audio or feedback.
- AI: Mistral's API (EU) only, so Jude does not work offline: an accepted
  exception to Haij's second rule (ADR 0005). Chat model for the role
  and the feedback, Voxtral for transcription (`da`) and speech. Danish has no preset voices;
  voices are cloned from recordings made with the speaker's written
  consent, listed in `docs/voices.md`.
- Conversation content lives in the browser and in server memory for the
  length of one request. It is never written to the database, a file or a
  log line. Logs record counts and durations only; errors are logged by
  kind (`src/lib/conversation-api.ts`). ADR 0002.
- A signed ticket (`src/domain/ticket.ts`) carries a conversation's start,
  turn count and safety stop, never its words, so the server enforces them
  without storing anything.
- Cost ceilings (`src/domain/limits.ts`), set in environment variables:
  minutes and turns per conversation, characters per field and per turn,
  seconds per turn, and per day per account and for the whole server,
  counted by the database function `charge_usage()`. Over a ceiling, Jude
  says so plainly and stops. ADR 0003.
- Safety: Mistral's moderation, our own Danish word check and a marker in
  the role prompt; any one ends the conversation for good
  (`src/domain/safety.ts`, `tests/safety.test.ts`). ADR 0004.
- The routes: `src/app/api/conversation/{start,turn,feedback}` and
  `src/app/api/voices/[id]/preview`. The screen is one client component,
  `src/components/conversation/coach.tsx`.
- `JUDE_FAKE_AI=on` gives a scripted stand-in for Mistral on a
  development machine only (`src/services/fake-ai.ts`); it is ignored when
  `NODE_ENV` is production.
- `src/domain`: pure rules (limits, safety decision, prompt building,
  feedback shape), fully tested. `src/services`: database and Mistral
  calls, each taking its dependencies. `src/actions` and route handlers:
  validate with zod, resolve the user, call a service. `src/components`,
  `src/app`: UI.
- Self-hosted with Docker Compose on the same Hetzner server as Prismatic,
  at `coach.lenskjoldconsulting.dk`, deployed with Coolify; the app listens
  on 127.0.0.1:3002 so it does not clash with Prismatic (3000) or Distil (3001)
  (`docs/self-hosting.md`). The development database runs on port 5435.
  `docs/subprocessors.md` lists Mistral (what it sees, how long it keeps
  it) and changes before any new third party does. No other network
  calls, no secrets in the code.
- Demo (`JUDE_DEMO=on`): a throwaway account per visitor, deleted after
  24 hours, with privacy policy and terms in the operator's name, as in
  Prismatic (`src/lib/operator.ts`, ADR 0006 there). The demo says on
  screen that Jude keeps nothing of what is said, and that the profile is
  deleted after 24 hours.
- Tests: `tests/*.test.ts`. The database tests need `pnpm db:up`;
  `tests/isolation.test.ts` holds the meta-test that fails a table with a
  person's data and no forced RLS.

## Visual identity and UX

The chosen direction is `design/jude-enkel.html`. A single centred column
(max 560 px) on a paper background; on a computer the same column sits in
the middle of a larger surface.

Paper #F8F6F2, beige #EFEAE4, ink #2F3F44, slate #5C6A6F, line #C9C1B6,
hairline #E4DED5, accent #A88E6E used sparingly. Good #4F7A5A for
"Virkede", amber #B8862F for "Prøv i stedet". Inter, never serif, tabular
numerals. White input fields with thin lines and a clear focus. Small
uppercase labels with wide letter spacing in the accent colour.

The conversation screen holds the other person's initial in a circle with
a soft ring while they speak, the subtitle, and the microphone; at the top
only the time and "Afslut". Motion only where it explains (the ring, the
microphone state), off under `prefers-reduced-motion`. Test at 390 px and
1280 px, no horizontal scroll, keyboard reachable, real buttons with
`aria-label`.

## Ways of working

1. Plan first; get approval for anything that changes the product rules.
2. Vertical slices; keep the app runnable at every commit.
3. Run `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm format` after
   changes and keep them green.
4. One responsibility per file; no file over roughly 300 lines.
5. Conventional commits. Significant decisions get an ADR in `docs/adr/`
   naming the trade-off accepted.
6. Code, comments and docs in English; UI copy in Danish.
7. Ask before adding a dependency or deleting files.
8. Never weaken RLS, the audit log, sign-in, the safety stop or the cost
   ceilings to make a feature easier. Never store conversation content.
9. The product owner checks locally before anything goes live; commit
   after their OK and give them `git -C "C:\Users\Stylf\ClaudeProjekter\SamtaleCoach" push`.
