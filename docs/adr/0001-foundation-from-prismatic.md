# ADR 0001 — The foundation is copied from Prismatic

Date: 2026-11-12. Status: accepted.

## Context

Jude needs what Prismatic already has and has tested: accounts with
scrypt passwords, two-step sign-in and passkeys, Postgres with forced
row-level security, an append-only audit log, deleting an account
completely, a one-click export, a demo mode with throwaway accounts
deleted after 24 hours, and a privacy policy and terms in the operator's
name. Prismatic's ADRs 0002, 0003, 0004 and 0006 record why each is built
the way it is.

## Decision

Copy those parts into Jude and adapt them, rather than share a package.
What Jude does not need (programmes, the roadmap, the report, the
spreadsheet export) is left out. The application role is `jude_app`, the
settings are `JUDE_*`, and the audit log is keyed by the account
(`owner_id`) instead of a programme.

## Trade-off accepted

A fix to the shared parts must be made twice, in Prismatic and in Jude.
In return each product can change without breaking the other, and each
repository can be read on its own.
