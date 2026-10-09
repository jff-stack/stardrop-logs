// Mia's animation states: which chibi frames to play, how fast, and how her
// whole body moves on top of that.
//   idle       breathing bob and the odd blink
//   help       waving, with sparkles
//   celebrate  happy hops, with hearts
//   checkin    toddling back and forth
//   inspect    looking sideways with a head tilt
import type { ChibiFrameName } from "./chibi";

export type MiaState = "idle" | "help" | "celebrate" | "checkin" | "inspect";

export type BodyMotion = "bob" | "hop" | "pace" | "tilt";

export interface MiaAnimation {
  /** Frames in play order. Repeating a frame holds it longer. */
  frames: ChibiFrameName[];
  /** Playback speed in frames per second. */
  fps: number;
  /** Whole-sprite movement layered on top of the frame loop. */
  motion: BodyMotion;
  /** Ambient particles while in this state. */
  particles?: "sparkle" | "heart";
}

export const MIA_ANIMATIONS: Record<MiaState, MiaAnimation> = {
  idle: {
    // Long open-eye holds with quick blinks (one double-blink) feel alive.
    frames: [
      "idle", "idle", "idle", "idle", "idle", "idle", "idle", "blink",
      "idle", "idle", "idle", "idle", "idle", "blink", "idle", "blink",
    ],
    fps: 4,
    motion: "bob",
  },
  help: {
    frames: ["waveHigh", "waveLow"],
    fps: 4,
    motion: "bob",
    particles: "sparkle",
  },
  celebrate: {
    frames: ["happy", "waveHigh", "waveLow", "waveHigh", "waveLow", "happy"],
    fps: 6,
    motion: "hop",
    particles: "heart",
  },
  checkin: {
    // Front-facing toddle; MiaSprite flips her on the way back.
    frames: ["stepLeft", "idle", "stepRight", "idle"],
    fps: 6,
    motion: "pace",
  },
  inspect: {
    frames: ["look", "look", "look", "look", "blink", "look", "look", "idle"],
    fps: 3,
    motion: "tilt",
  },
};
