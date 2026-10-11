// Turns an avatar's saved choices into a picture: a 16x16 grid plus the
// colours for it. Pure, so it runs the same on the server and in the browser.
//
// Nothing here trusts its input. Avatars are shown to friends, so a config
// can come from someone else's row, from an older version of the app, or
// from a part that has since been removed. Anything unknown quietly becomes
// that slot's default instead of breaking the page.
import type { PixelGrid, PixelPalette } from "@/components/ui/PixelArt";
import { seededRandom } from "@/lib/random";
import {
  AVATAR_SIZE, AVATAR_SLOTS, BODY, FIXED_COLORS, HEAD, SLOT_DEFAULT, findPart, partsFor,
  type AvatarPart, type AvatarSlot,
} from "./parts";

/** What's saved in profiles.avatar. `v` is the shape's version. */
export type AvatarConfig = { v: 1 } & Record<AvatarSlot, string>;

/** The part to draw for a slot: the chosen one, or the slot's default. */
function partFor(config: Partial<Record<AvatarSlot, unknown>>, slot: AvatarSlot): AvatarPart {
  return findPart(slot, config[slot]) ?? findPart(slot, SLOT_DEFAULT[slot])!;
}

const key = (config: Partial<Record<AvatarSlot, unknown>>) =>
  AVATAR_SLOTS.map((slot) => partFor(config, slot).id).join("|");

/** Lay `layer` over `base`; "." lets what's underneath show. */
function overlay(base: string[], layer: PixelGrid | undefined): string[] {
  if (!layer) return base;
  return base.map((row, y) => {
    const over = layer[y];
    if (!over) return row;
    let out = "";
    for (let x = 0; x < AVATAR_SIZE; x++) out += over[x] && over[x] !== "." ? over[x] : row[x];
    return out;
  });
}

// The same few avatars are drawn again and again (nav, cards, editor tiles),
// so finished grids are kept. Bounded, in case of a very long session.
const composed = new Map<string, PixelGrid>();
const MAX_KEPT = 500;

/**
 * The avatar as 16 rows of 16 letters. Layers go on in a fixed order:
 * background, body, outfit, head, face, hair, extras.
 */
export function composeAvatar(config: Partial<Record<AvatarSlot, unknown>>): PixelGrid {
  const k = key(config);
  const kept = composed.get(k);
  if (kept) return kept;

  let grid: string[] = Array.from({ length: AVATAR_SIZE }, () => "b".repeat(AVATAR_SIZE));
  grid = overlay(grid, BODY);
  grid = overlay(grid, partFor(config, "outfit").grid);
  grid = overlay(grid, HEAD);
  grid = overlay(grid, partFor(config, "eyes").grid);
  grid = overlay(grid, partFor(config, "hair").grid);
  grid = overlay(grid, partFor(config, "accessory").grid);

  if (composed.size >= MAX_KEPT) composed.clear();
  composed.set(k, grid);
  return grid;
}

/** The colour behind each letter of composeAvatar's grid, for this avatar. */
export function avatarPalette(config: Partial<Record<AvatarSlot, unknown>>): PixelPalette {
  return {
    ...FIXED_COLORS,
    ...partFor(config, "skin").colors,
    ...partFor(config, "hairColor").colors,
    ...partFor(config, "outfitColor").colors,
    ...partFor(config, "bg").colors,
    ...partFor(config, "accessory").colors,
  };
}

/** A config picked with `rand` (0 to 1), from the parts anyone may use. */
export function randomAvatar(rand: () => number = Math.random): AvatarConfig {
  const pick = (slot: AvatarSlot) => {
    const free = partsFor(slot).filter((p) => p.free);
    return free[Math.floor(rand() * free.length) % free.length].id;
  };
  const config = { v: 1 } as AvatarConfig;
  for (const slot of AVATAR_SLOTS) config[slot] = pick(slot);
  return config;
}

/** FNV-1a: a small, steady way to turn an id into a number. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The avatar someone has before they've made one. Worked out from their id,
 * so it's always the same for them and nobody needs a row filled in.
 */
export function defaultAvatar(userId: string): AvatarConfig {
  const rand = seededRandom(hash(userId));
  const config = randomAvatar(rand);
  // Most people start without an extra; it's nicer to add one than remove one.
  if (rand() < 0.7) config.accessory = "acc_none";
  return config;
}

/**
 * A config that is safe to draw and to edit, from whatever was stored.
 * Nothing stored (or not an object) gives that person's default avatar.
 * A slot with a missing or unknown id gets the slot default.
 */
export function resolveAvatar(raw: unknown, userId: string): AvatarConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaultAvatar(userId);
  const stored = raw as Partial<Record<AvatarSlot, unknown>>;
  const config = { v: 1 } as AvatarConfig;
  for (const slot of AVATAR_SLOTS) config[slot] = partFor(stored, slot).id;
  return config;
}

export const sameAvatar = (a: AvatarConfig, b: AvatarConfig) => AVATAR_SLOTS.every((slot) => a[slot] === b[slot]);
