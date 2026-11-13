# Deploying Jude with Coolify

How Jude goes on the server beside Prismatic and Distil, at
`https://coach.lenskjoldconsulting.dk`. Follows the same steps as Distil
(`docs/deploy-coolify.md` there). On the server, Prismatic uses port
3000, Distil 3001 and Jude 3002 on `127.0.0.1`; Coolify's Traefik serves
all three over HTTPS.

## 1. DNS

At the DNS provider for `lenskjoldconsulting.dk`, add an `A` record:

| Name    | Type | Value                                       |
| ------- | ---- | ------------------------------------------- |
| `coach` | A    | the server's IPv4 (the same as Prismatic's) |

No `AAAA` record: Prismatic and Distil have none either. Traefik gets
the HTTPS certificate by itself once the name points at the server. The
microphone works only over HTTPS.

## 2. The resource in Coolify

1. **+ New → Resource**, in the same project and server as Prismatic.
2. **Public repository**: `https://github.com/Stylfan/jude`, branch
   `main`.
3. **Build pack: Docker Compose**, file `docker-compose.yml`.
4. On the service **app**, set the domain to
   `https://coach.lenskjoldconsulting.dk:3000` (the port is the
   container's, not the host's). Leave `db` and `migrate` without a domain.

## 3. Environment

In the resource's **Environment Variables**. Make each secret with
`openssl rand -hex 32`. Mark the secrets as secret, so they are not shown
in build logs.

| Variable                | Value                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| `POSTGRES_PASSWORD`     | a new secret                                                         |
| `JUDE_APP_PASSWORD`     | another new secret                                                   |
| `JUDE_SECRET`           | a third new secret; never change it once people use two-step sign-in |
| `JUDE_URL`              | `https://coach.lenskjoldconsulting.dk`                               |
| `MISTRAL_API_KEY`       | a key from console.mistral.ai, made for the server only              |
| `JUDE_VOICES`           | the line `JUDE_VOICES=` from the local `.env`, without the name      |
| `JUDE_DEMO`             | `on`                                                                 |
| `JUDE_OPERATOR_NAME`    | `Lenskjold Consulting`                                               |
| `JUDE_OPERATOR_EMAIL`   | the address people may write to about their data                     |
| `JUDE_OPERATOR_ADDRESS` | address and CVR, one line (optional)                                 |
| `JUDE_HOSTING`          | `Hetzner Online GmbH i Tyskland`                                     |
| `JUDE_SOURCE_URL`       | `https://github.com/Stylfan/jude`                                    |

Leave `JUDE_SIGNUP` empty: the site is a demo only. Never set
`JUDE_FAKE_AI` on the server; it is ignored in production anyway. The
ceilings keep their defaults (3 conversations per visit per day, 300 for
the whole server) unless set.

## 4. Deploy

Press **Deploy**. Compose builds the image, starts Postgres, runs the
migrations once (the `migrate` service stops when done; that is expected)
and starts the app. Then:

- `https://coach.lenskjoldconsulting.dk/api/health` answers `{"ok":true}`.
- The front page shows "Start demoen".
- On the phone: start the demo, allow the microphone, and hold a short
  conversation with a man, so the voice is heard.

Coolify does not deploy by itself after a push; press **Redeploy**.

## 5. Memory and backups

Jude adds its own Postgres and a Node server, a few hundred MB together.
The database holds no conversations and stays small. Back up the `pgdata`
volume as in `docs/self-hosting.md`, keeping copies at most 7 days, as the
privacy policy says.
