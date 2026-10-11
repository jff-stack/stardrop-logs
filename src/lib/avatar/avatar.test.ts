import { describe, expect, it } from "vitest";
import {
  avatarPalette, composeAvatar, defaultAvatar, randomAvatar, resolveAvatar, sameAvatar, type AvatarConfig,
} from "./compose";
import {
  AVATAR_KEYS, AVATAR_SIZE, AVATAR_SLOTS, BODY, HEAD, PARTS, SLOT_DEFAULT, SLOT_LABEL, findPart, partsFor,
} from "./parts";
import { seededRandom } from "@/lib/random";
import { AvatarSchema } from "@/lib/validation";

const BASE = { v: 1, ...SLOT_DEFAULT } as AvatarConfig;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("catalogue", () => {
  it("has the agreed number of parts in each slot", () => {
    const counts = Object.fromEntries(AVATAR_SLOTS.map((slot) => [slot, partsFor(slot).length]));
    expect(counts).toEqual({ skin: 6, hair: 8, hairColor: 10, outfit: 6, outfitColor: 8, eyes: 5, accessory: 4, bg: 8 });
    expect(partsFor("accessory").map((p) => p.id)).toEqual(["acc_none", "acc_glasses", "acc_headband", "acc_scarf"]);
  });

  it("draws every shape 16x16 with only the known letters", () => {
    const shapes = [...PARTS.filter((p) => p.grid).map((p) => [p.id, p.grid!] as const), ["BODY", BODY] as const, ["HEAD", HEAD] as const];
    expect(shapes.length).toBeGreaterThan(20);
    for (const [id, grid] of shapes) {
      expect(grid, id).toHaveLength(AVATAR_SIZE);
      for (const row of grid) {
        expect(row, id).toHaveLength(AVATAR_SIZE);
        for (const ch of row) if (ch !== ".") expect(AVATAR_KEYS, `${id}: ${ch}`).toContain(ch);
      }
    }
  });

  it("gives shape slots a grid and colour slots colours", () => {
    for (const p of PARTS) {
      if (["hair", "outfit", "eyes", "accessory"].includes(p.slot)) expect(p.grid, p.id).toBeDefined();
      else expect(Object.keys(p.colors ?? {}).length, p.id).toBeGreaterThan(0);
      for (const hex of Object.values(p.colors ?? {})) expect(hex, p.id).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("uses ids the database will accept, with no repeats", () => {
    for (const p of PARTS) expect(p.id).toMatch(/^[a-z0-9_]{1,24}$/);
    expect(new Set(PARTS.map((p) => p.id)).size).toBe(PARTS.length);
  });

  it("has a real, free default and a label for every slot", () => {
    for (const slot of AVATAR_SLOTS) {
      expect(findPart(slot, SLOT_DEFAULT[slot])?.free, slot).toBe(true);
      expect(SLOT_LABEL[slot]).toBeTruthy();
    }
    // Everything is free today.
    expect(PARTS.every((p) => p.free)).toBe(true);
  });

  it("won't hand back a part from the wrong slot", () => {
    expect(findPart("hair", "hair_bob")?.name).toBe("Bob");
    expect(findPart("outfit", "hair_bob")).toBeUndefined();
    expect(findPart("hair", 42)).toBeUndefined();
  });
});

describe("composeAvatar", () => {
  it("returns 16 rows of 16, fully coloured in", () => {
    const grid = composeAvatar(BASE);
    const palette = avatarPalette(BASE);
    expect(grid).toHaveLength(16);
    for (const row of grid) {
      expect(row).toHaveLength(16);
      for (const ch of row) expect(palette[ch], ch).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("gives the same picture for the same choices", () => {
    expect(composeAvatar({ ...BASE })).toEqual(composeAvatar({ ...BASE }));
    // And reuses the finished grid instead of building it again.
    expect(composeAvatar({ ...BASE })).toBe(composeAvatar({ ...BASE }));
    expect(composeAvatar({ ...BASE, hair: "hair_long" })).not.toEqual(composeAvatar(BASE));
  });

  it("layers in order: background, body, outfit, head, face, hair, extras", () => {
    const grid = composeAvatar({ ...BASE, hair: "hair_long", accessory: "acc_headband", outfit: "outfit_sweater" });
    expect(grid[0][0]).toBe("b"); // corner is backdrop
    expect(grid[7][7]).toBe("s"); // middle of the face is skin
    expect(grid[3][7]).toBe("a"); // headband sits on top of the hair
    expect(grid[4][7]).toBe("h"); // fringe covers the forehead
    expect(grid[12][3]).toBe("h"); // long hair falls over the shoulder
    expect(grid[11][7]).toBe("c"); // roll-neck covers the neck
    expect(composeAvatar(BASE)[11][7]).toBe("S"); // a T-shirt doesn't
  });

  it("swaps colours without changing the drawing", () => {
    const blonde = { ...BASE, hairColor: "hc_5" };
    expect(composeAvatar(blonde)).toEqual(composeAvatar(BASE));
    expect(avatarPalette(blonde).h).toBe("#e8c46a");
    expect(avatarPalette(blonde).h).not.toBe(avatarPalette(BASE).h);
    expect(avatarPalette({ ...BASE, skin: "skin_6" }).s).toBe("#6b432a");
    expect(avatarPalette({ ...BASE, bg: "bg_8" }).b).toBe("#40297f");
  });

  it("falls back to the slot default for ids it doesn't know", () => {
    const odd = { ...BASE, hair: "hair_mohawk_deluxe", outfitColor: "", eyes: "hair_bob", accessory: "acc_crown" };
    expect(composeAvatar(odd)).toEqual(composeAvatar(BASE));
    expect(avatarPalette(odd)).toEqual(avatarPalette(BASE));
  });

  it("never throws on junk", () => {
    const junk: unknown[] = [{}, { hair: null }, { hair: 7, skin: ["x"], bg: {} }, { v: 99, extra: "yes" }];
    for (const j of junk) {
      expect(composeAvatar(j as never)).toEqual(composeAvatar(BASE));
      expect(avatarPalette(j as never)).toEqual(avatarPalette(BASE));
    }
  });

  it("composes 500 random avatars cleanly", () => {
    const rand = seededRandom(2026);
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const config = randomAvatar(rand);
      expect(AvatarSchema.safeParse(config).success).toBe(true);
      const grid = composeAvatar(config);
      const palette = avatarPalette(config);
      expect(grid).toHaveLength(16);
      for (const row of grid) {
        expect(row).toHaveLength(16);
        for (const ch of row) expect(palette[ch]).toBeDefined();
      }
      seen.add(JSON.stringify(config));
    }
    expect(seen.size).toBeGreaterThan(450);
  });
});

describe("defaultAvatar", () => {
  it("is the same every time for the same person", () => {
    expect(defaultAvatar(uuid(1))).toEqual(defaultAvatar(uuid(1)));
    expect(defaultAvatar("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")).toEqual(defaultAvatar("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"));
  });

  it("differs from person to person", () => {
    const looks = new Set(Array.from({ length: 200 }, (_, i) => JSON.stringify(defaultAvatar(uuid(i)))));
    expect(looks.size).toBeGreaterThan(190);
    // And they don't all share one hairdo or one backdrop.
    const hairs = new Set(Array.from({ length: 200 }, (_, i) => defaultAvatar(uuid(i)).hair));
    expect(hairs.size).toBe(8);
  });

  it("is always something a user could have saved", () => {
    for (let i = 0; i < 200; i++) expect(AvatarSchema.safeParse(defaultAvatar(uuid(i))).success).toBe(true);
  });
});

describe("resolveAvatar", () => {
  it("uses the person's default when nothing usable is stored", () => {
    for (const raw of [null, undefined, "hair_short", 3, [], [BASE]]) {
      expect(resolveAvatar(raw, uuid(5))).toEqual(defaultAvatar(uuid(5)));
    }
  });

  it("keeps good choices and repairs bad ones slot by slot", () => {
    const stored = { v: 1, ...SLOT_DEFAULT, hair: "hair_pony", bg: "bg_from_the_future", extra: "ignored" };
    const fixed = resolveAvatar(stored, uuid(5));
    expect(fixed.hair).toBe("hair_pony");
    expect(fixed.bg).toBe(SLOT_DEFAULT.bg);
    expect(Object.keys(fixed).sort()).toEqual(["v", ...AVATAR_SLOTS].sort());
    expect(AvatarSchema.safeParse(fixed).success).toBe(true);
  });

  it("compares avatars by their choices", () => {
    expect(sameAvatar(BASE, { ...BASE })).toBe(true);
    expect(sameAvatar(BASE, { ...BASE, eyes: "eyes_wink" })).toBe(false);
  });
});

describe("AvatarSchema", () => {
  it("accepts the example shape", () => {
    const example = {
      v: 1, skin: "skin_3", hair: "hair_short", hairColor: "hc_5", outfit: "outfit_hoodie",
      outfitColor: "oc_2", eyes: "eyes_happy", accessory: "acc_none", bg: "bg_4",
    };
    expect(AvatarSchema.parse(example)).toEqual(example);
  });

  it("rejects unknown ids, ids from another slot, and the wrong shape", () => {
    expect(AvatarSchema.safeParse({ ...BASE, hair: "hair_crown" }).success).toBe(false);
    expect(AvatarSchema.safeParse({ ...BASE, hair: "outfit_tee" }).success).toBe(false);
    expect(AvatarSchema.safeParse({ ...BASE, extra: "x" }).success).toBe(false);
    expect(AvatarSchema.safeParse({ ...BASE, v: 2 }).success).toBe(false);
    expect(AvatarSchema.safeParse({ ...BASE, bg: undefined }).success).toBe(false);
    expect(AvatarSchema.safeParse({ ...BASE, skin: 3 }).success).toBe(false);
    expect(AvatarSchema.safeParse("hair_short").success).toBe(false);
  });

  it("rejects a part that isn't free", () => {
    // Pretend the shop has opened and the scarf now costs something.
    const scarf = findPart("accessory", "acc_scarf")!;
    expect(AvatarSchema.safeParse({ ...BASE, accessory: "acc_scarf" }).success).toBe(true);
    scarf.free = false;
    try {
      expect(AvatarSchema.safeParse({ ...BASE, accessory: "acc_scarf" }).success).toBe(false);
      // It still draws for someone who already has it saved.
      expect(composeAvatar({ ...BASE, accessory: "acc_scarf" })).not.toEqual(composeAvatar(BASE));
      // But is never handed out at random or by default.
      const rand = seededRandom(7);
      for (let i = 0; i < 200; i++) expect(randomAvatar(rand).accessory).not.toBe("acc_scarf");
    } finally {
      scarf.free = true;
    }
  });
});
