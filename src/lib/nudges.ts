// Nudges are presets only. There is no free text anywhere, so a nudge can
// never carry a comment about someone's logs (or anything unkind).
//
// The list of kinds is also a CHECK in supabase/migrations/0005_friends.sql;
// change both together.

export const NUDGE_KINDS = ["hello", "thirsty", "water", "stretch", "proud", "thinking"] as const;
export type NudgeKind = (typeof NUDGE_KINDS)[number];

interface NudgePreset {
  /** On the button the sender taps. */
  label: string;
  /** What Mia passes on to the person receiving it. */
  text: string;
}

export const NUDGES: Record<NudgeKind, NudgePreset> = {
  hello: { label: "Say hi", text: "Hi from the garden next door!" },
  thirsty: { label: "Garden's thirsty", text: "The watering can is out whenever you fancy a check-in." },
  water: { label: "Water break", text: "Glass of water time. Cheers!" },
  stretch: { label: "Stretch break", text: "Stand up and have a little wiggle." },
  proud: { label: "Proud of you", text: "Just so you know, you're doing great." },
  thinking: { label: "Thinking of you", text: "No reason. Just thinking of you." },
};

export const isNudgeKind = (v: unknown): v is NudgeKind =>
  typeof v === "string" && (NUDGE_KINDS as readonly string[]).includes(v);

/** Mia's line when a nudge arrives: who it's from, then the preset. */
export function nudgeLine(kind: string, senderName: string): string {
  const preset = isNudgeKind(kind) ? NUDGES[kind] : NUDGES.hello;
  return `${senderName} sent you a nudge: "${preset.text}"`;
}
