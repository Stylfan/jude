# Running Jude on your own server

Jude runs as three containers from `docker-compose.yml`: Postgres, a
one-off migration step, and the app on `127.0.0.1:3001`. Put a reverse
proxy with HTTPS in front of it. The microphone works only over HTTPS
(or on localhost).

## What you need

- A small Linux server in the EU with Docker (2 GB of memory is enough
  for Jude; it fits beside Prismatic on a 4 GB server).
- A Mistral API key on a paid plan (see `docs/subprocessors.md`).
- Optionally, Danish voices cloned from consented recordings
  (`docs/voices.md`). Without them, the other person answers in subtitles.

## First start with Docker Compose

```bash
cp .env.production.example .env.production   # fill it in
docker compose --env-file .env.production up -d --build
```

Make each secret with
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
`JUDE_SECRET` also signs the conversation tickets; do not change it once
people use two-step sign-in.

## With Coolify, beside Prismatic

1. New resource, Docker Compose, from the GitHub repository, branch
   `main`, compose file `docker-compose.yml`.
2. Domain for the `app` service: `https://coach.lenskjoldconsulting.dk`,
   port 3000 inside the container.
3. Environment variables: everything in `.env.production.example`, with
   `JUDE_DEMO=on`, the operator's name, e-mail, address and
   `JUDE_HOSTING=Hetzner Online GmbH i Tyskland`.
4. Deploy. Coolify does not deploy by itself after a push; press
   Redeploy each time.

## A demo installation

`JUDE_DEMO=on` gives each visitor a throwaway account without e-mail or
password, deleted with its profile after 24 hours (or at once with
"Afslut demoen"). At most 300 visits at once. Sign-up stays closed unless
`JUDE_SIGNUP=open`. The ceilings in `src/domain/limits.ts` apply per
visit and for the whole server per day; tighten them in the environment.

## Hosting it for others

Set `JUDE_OPERATOR_NAME`, `JUDE_OPERATOR_EMAIL` and, if you like,
`JUDE_OPERATOR_ADDRESS` and `JUDE_HOSTING`. The sign-in pages then link to
a privacy policy (`/privatliv`) and terms (`/vilkaar`) in that name. Have
the texts in `messages/da.json` under `legal` read by someone who knows
the law before opening the doors, and make data processing agreements
with your hosting provider and with Mistral.

## Backups

Only the database matters, and it holds no conversations:

```bash
docker compose exec db pg_dump -U postgres jude > jude-$(date +%F).sql
```

Keep backups for at most 7 days, as the privacy policy says.

## Updating

```bash
git pull
docker compose --env-file .env.production up -d --build
```

The migration step runs first and the app starts only when it has
finished.

## On your own machine

```bash
pnpm install
cp .env.example .env
pnpm db:up && pnpm db:migrate
pnpm dev
```

Without a Mistral key, set `JUDE_FAKE_AI=on` in `.env` to try the screens
with a scripted stand-in (development only).
