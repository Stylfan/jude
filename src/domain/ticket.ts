import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A conversation's ticket: who it belongs to, when it started, how many
 * turns it has had, and whether it was stopped for safety. Signed with
 * JUDE_SECRET and kept by the page, so the server stores nothing about the
 * conversation and the page still cannot reset its own clock, its count or
 * a safety stop. It carries no words of the conversation.
 */

export type Ticket = {
  /** A random id for this conversation; never stored. */
  id: string;
  userId: string;
  startedAt: number;
  turns: number;
  stopped: boolean;
};

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function sealTicket(ticket: Ticket, secret: string): string {
  const body = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function openTicket(token: string, secret: string): Ticket | null {
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const t = JSON.parse(Buffer.from(body, "base64url").toString()) as Ticket;
    if (
      typeof t.id !== "string" ||
      typeof t.userId !== "string" ||
      typeof t.startedAt !== "number" ||
      typeof t.turns !== "number" ||
      typeof t.stopped !== "boolean"
    ) {
      return null;
    }
    return t;
  } catch {
    return null;
  }
}
