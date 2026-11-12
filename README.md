# Jude

Rehearse a difficult conversation out loud before you have it. Say who
you are talking to and why. Jude plays the other person, with a voice and
a subtitle, and gives you feedback afterwards: four scores and three
moments in your own words, what worked and what to try instead.

For work and private life alike: an employee, a colleague, a boss, a son,
a partner. The interface is Danish.

- **Nothing about a conversation is stored.** Only what you type about
  yourself is kept, and you can export and delete it.
- **EU only.** The AI is Mistral (France), the server is yours.
- **Safe.** A conversation that points to a risk of harm stops and shows
  where to get help (Livslinien, 112).
- **Bounded cost.** Ceilings per conversation, per person and per day.

## Run it

```bash
pnpm install
cp .env.example .env          # add MISTRAL_API_KEY, or JUDE_FAKE_AI=on to try it
pnpm db:up && pnpm db:migrate
pnpm dev
```

Then open http://localhost:3000. A server installation is described in
[docs/self-hosting.md](docs/self-hosting.md), the voices in
[docs/voices.md](docs/voices.md), and who can see what in
[docs/subprocessors.md](docs/subprocessors.md).

## Checks

```bash
pnpm test && pnpm lint && pnpm typecheck && pnpm format:check
```

The tests need the development database (`pnpm db:up`).

## Licence

AGPL-3.0. Accounts, row-level security, the audit log, two-step sign-in,
passkeys and the demo mode come from
[Prismatic](https://github.com/Stylfan/prismatic) (ADR 0001).
