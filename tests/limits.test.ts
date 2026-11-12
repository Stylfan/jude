import { describe, expect, it } from "vitest";
import { DEFAULT_LIMITS, checkTurn, minutesUsed, readLimits, usageDay } from "@/domain/limits";
import { openTicket, sealTicket, type Ticket } from "@/domain/ticket";

describe("the cost ceilings", () => {
  it("read from the environment, with the defaults for anything unset or wrong", () => {
    const l = readLimits({
      JUDE_MINUTES_PER_CONVERSATION: "10",
      JUDE_TURNS_PER_CONVERSATION: "-3",
    });
    expect(l.minutesPerConversation).toBe(10);
    expect(l.turnsPerConversation).toBe(DEFAULT_LIMITS.turnsPerConversation);
    expect(l.account.conversations).toBe(3);
  });

  it("end a conversation at its minutes or its turns", () => {
    const l = DEFAULT_LIMITS;
    const start = 1_000_000;
    expect(checkTurn(l, { startedAt: start, turns: 0 }, start + 60_000)).toBe("ok");
    expect(checkTurn(l, { startedAt: start, turns: 0 }, start + 15 * 60_000 + 1)).toBe("time");
    expect(checkTurn(l, { startedAt: start, turns: 40 }, start)).toBe("turns");
    expect(minutesUsed(l, start, start + 4 * 60_000 + 59_000)).toBe(4);
    expect(minutesUsed(l, start, start + 99 * 60_000)).toBe(15);
  });

  it("count by the day in Copenhagen", () => {
    // 23:30 UTC on 12 November is 00:30 on 13 November in Copenhagen.
    expect(usageDay(Date.UTC(2026, 10, 12, 23, 30))).toBe("2026-11-13");
  });
});

describe("a conversation ticket", () => {
  const ticket: Ticket = { id: "c1", userId: "u1", startedAt: 5, turns: 2, stopped: false };
  const secret = "s".repeat(40);

  it("opens with the key it was sealed with", () => {
    expect(openTicket(sealTicket(ticket, secret), secret)).toEqual(ticket);
  });

  it("cannot be changed by the page, e.g. to undo a safety stop or reset the clock", () => {
    const sealed = sealTicket({ ...ticket, stopped: true }, secret);
    const [, mac] = sealed.split(".");
    const forged = `${Buffer.from(JSON.stringify(ticket)).toString("base64url")}.${mac}`;
    expect(openTicket(forged, secret)).toBeNull();
    expect(openTicket(sealTicket(ticket, "x".repeat(40)), secret)).toBeNull();
    expect(openTicket("rubbish", secret)).toBeNull();
  });
});
