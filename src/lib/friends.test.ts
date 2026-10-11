import { describe, expect, it } from "vitest";
import { BADGES } from "./badges";
import {
  FRIEND_CODE_ALPHABET, codeFromSegment, friendLink, friendPath, isFriendCode, normaliseFriendCode, prettyFriendCode,
} from "./friend-link";
import {
  NEVER_SHARED, SHARE_LEVELS, SHARE_OPTIONS, STATUS_TEXT, byName, countText, friendStatus, isShareLevel,
} from "./friends";
import { NUDGES, NUDGE_KINDS, isNudgeKind, nudgeLine } from "./nudges";
import { FriendCodeSchema, NudgeSchema, RespondSchema, SharingSchema, TimezoneSchema } from "./validation";

describe("friend codes", () => {
  it("uses an alphabet with no look-alikes", () => {
    expect(FRIEND_CODE_ALPHABET).toHaveLength(30);
    for (const ch of "0O1ILU") expect(FRIEND_CODE_ALPHABET).not.toContain(ch);
    expect(new Set(FRIEND_CODE_ALPHABET).size).toBe(30);
  });

  it("tidies case, spaces and dashes", () => {
    expect(normaliseFriendCode("abcd-2345")).toBe("ABCD2345");
    expect(normaliseFriendCode("  ab cd 23 45 ")).toBe("ABCD2345");
    expect(normaliseFriendCode("AbCd–2345")).toBe("ABCD2345");
    expect(normaliseFriendCode("ABCD2345")).toBe("ABCD2345");
  });

  it("accepts only 8 characters from the alphabet", () => {
    expect(isFriendCode("ABCD2345")).toBe(true);
    expect(isFriendCode("ABCD234")).toBe(false);
    expect(isFriendCode("ABCD23456")).toBe(false);
    expect(isFriendCode("ABCD234O")).toBe(false); // letter O
    expect(isFriendCode("ABCD2340")).toBe(false); // zero
    expect(isFriendCode("ABCD234I")).toBe(false);
    expect(isFriendCode("abcd2345")).toBe(false); // tidy it first
  });

  it("builds and reads links", () => {
    expect(friendPath("ABCD2345")).toBe("/friends/add/ABCD2345");
    expect(friendLink("https://example.com", "ABCD2345")).toBe("https://example.com/friends/add/ABCD2345");
    expect(friendLink("https://example.com/", "ABCD2345")).toBe("https://example.com/friends/add/ABCD2345");
    expect(prettyFriendCode("ABCD2345")).toBe("ABCD-2345");
  });

  it("reads the code from a link segment, however it was typed", () => {
    expect(codeFromSegment("ABCD2345")).toBe("ABCD2345");
    expect(codeFromSegment("abcd-2345")).toBe("ABCD2345");
    expect(codeFromSegment("abcd%202345")).toBe("ABCD2345");
  });

  it("refuses anything that isn't a code", () => {
    for (const bad of ["", null, undefined, "ABC", "ABCD23450", "../../etc", "%E0%A4%A", "<script>", "OOOOOOOO"]) {
      expect(codeFromSegment(bad)).toBeNull();
    }
  });

  it("validates the same way in the schema", () => {
    expect(FriendCodeSchema.parse("abcd-2345")).toBe("ABCD2345");
    expect(FriendCodeSchema.safeParse("nope").success).toBe(false);
    expect(FriendCodeSchema.safeParse("ABCD234O").success).toBe(false);
  });
});

describe("nudges", () => {
  it("has five or six presets, all with words", () => {
    expect(NUDGE_KINDS.length).toBeGreaterThanOrEqual(5);
    expect(NUDGE_KINDS.length).toBeLessThanOrEqual(6);
    expect(Object.keys(NUDGES).sort()).toEqual([...NUDGE_KINDS].sort());
    for (const kind of NUDGE_KINDS) {
      expect(NUDGES[kind].label.length).toBeGreaterThan(2);
      expect(NUDGES[kind].text.length).toBeGreaterThan(5);
    }
  });

  it("matches the list the database allows", () => {
    // Same list as the CHECK on public.nudges.kind in 0005_friends.sql.
    expect([...NUDGE_KINDS]).toEqual(["hello", "thirsty", "water", "stretch", "proud", "thinking"]);
  });

  it("never mentions logs, counts or how long it's been", () => {
    for (const kind of NUDGE_KINDS) {
      const words = `${NUDGES[kind].label} ${NUDGES[kind].text}`;
      expect(words).not.toMatch(/\d|log|poop|streak|days?|late|behind|forgot|should|haven't|missed/i);
    }
  });

  it("only accepts known kinds", () => {
    expect(isNudgeKind("hello")).toBe(true);
    expect(isNudgeKind("u r gross")).toBe(false);
    expect(NudgeSchema.safeParse({ friendId: crypto.randomUUID(), kind: "water" }).success).toBe(true);
    expect(NudgeSchema.safeParse({ friendId: crypto.randomUUID(), kind: "custom text" }).success).toBe(false);
    expect(NudgeSchema.safeParse({ friendId: "not-an-id", kind: "water" }).success).toBe(false);
  });

  it("says who it's from", () => {
    expect(nudgeLine("water", "Sam")).toBe('Sam sent you a nudge: "Glass of water time. Cheers!"');
    // An unknown kind (older app, newer database) still reads fine.
    expect(nudgeLine("mystery", "Sam")).toContain("Sam sent you a nudge");
  });
});

describe("sharing", () => {
  it("offers off, active and counts, most private first", () => {
    expect([...SHARE_LEVELS]).toEqual(["off", "active", "counts"]);
    expect(SHARE_OPTIONS.map((o) => o.value)).toEqual(["off", "active", "counts"]);
    expect(isShareLevel("counts")).toBe(true);
    expect(isShareLevel("everything")).toBe(false);
  });

  it("spells out what is never shared", () => {
    for (const word of ["type", "colour", "habits", "notes", "time of day", "quiet days", "birthday", "gender", "email"]) {
      expect(NEVER_SHARED).toContain(word);
    }
  });

  it("validates the sharing form", () => {
    expect(SharingSchema.parse({ share_level: "active", accept_nudges: true })).toEqual({ share_level: "active", accept_nudges: true });
    expect(SharingSchema.safeParse({ share_level: "public", accept_nudges: true }).success).toBe(false);
    expect(SharingSchema.safeParse({ share_level: "off" }).success).toBe(false);
    expect(RespondSchema.safeParse({ id: crypto.randomUUID(), accept: false }).success).toBe(true);
    expect(RespondSchema.safeParse({ id: "1", accept: true }).success).toBe(false);
  });

  it("accepts timezone names and nothing odd", () => {
    for (const ok of ["UTC", "Europe/London", "America/Argentina/Buenos_Aires", "Etc/GMT+5"]) {
      expect(TimezoneSchema.safeParse(ok).success).toBe(true);
    }
    for (const bad of ["", "Europe/London; drop table", "a".repeat(70), "Mars Base"]) {
      expect(TimezoneSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe("friend cards", () => {
  it("shows a friend who hasn't logged as resting, with no judgement", () => {
    expect(friendStatus({ share_level: "active", logged_today: true })).toBe("logged");
    expect(friendStatus({ share_level: "active", logged_today: false })).toBe("resting");
    expect(friendStatus({ share_level: "off", logged_today: null })).toBe("private");
    for (const text of Object.values(STATUS_TEXT)) {
      expect(text).not.toMatch(/\d|hasn't|not logged|missed|behind|late|streak/i);
    }
  });

  it("lists friends by name and nothing else", () => {
    const list = [
      { name: "sam", today_count: 9 },
      { name: "Ada", today_count: 0 },
      { name: "Élodie", today_count: 3 },
      { name: "bea", today_count: 5 },
    ];
    expect(byName(list).map((f) => f.name)).toEqual(["Ada", "bea", "Élodie", "sam"]);
    // The original list is left alone.
    expect(list[0].name).toBe("sam");
  });

  it("words counts plainly", () => {
    expect(countText({ today_count: null })).toBeNull();
    expect(countText({ today_count: 0 })).toBe("No logs yet today");
    expect(countText({ today_count: 1 })).toBe("1 log today");
    expect(countText({ today_count: 3 })).toBe("3 logs today");
  });

  it("only ever shows a streak badge that exists", () => {
    // best_streak_badge() in 0005_friends.sql returns these ids.
    for (const id of ["streak-3", "streak-7", "streak-14", "streak-30", "streak-60", "streak-100", "streak-200", "streak-365"]) {
      expect(BADGES.find((b) => b.id === id)?.group).toBe("Streak");
    }
  });
});
