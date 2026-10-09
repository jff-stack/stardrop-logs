// mulberry32, a tiny seeded random number generator. Same seed, same numbers,
// which keeps the server and client markup identical.
export function seededRandom(seed: number) {
  let state = seed;
  return () => {
    // `| 0` is intentional: mulberry32 relies on 32-bit integer wrap-around.
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
