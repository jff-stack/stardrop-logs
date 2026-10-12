// The everyday tips. General habits, not medical advice or treatment.
//
// Every line here is wording that was handed over as final: change one only
// with a clinician or dietitian's review (docs/TIPS.md has the rules, which
// tip-library.test.ts enforces). Which tip shows up for whom is coach.ts.

export type TipTopic =
  | "routine"
  | "food-drink"
  | "movement"
  | "posture"
  | "stress-sleep"
  | "travel"
  | "loose"
  | "get-checked";

/** Who a tip is for. "any" is a good day-to-day tip for everyone. */
export type TipAudience = "any" | "hard" | "loose" | "gap" | "steady";

export type TipEvidence = "strong" | "moderate" | "limited";

export interface Tip {
  id: string;
  topic: TipTopic;
  text: string;
  audience: TipAudience;
  evidence: TipEvidence;
  sourceId?: string;
}

export interface TipSource {
  label: string;
  /** Plain-text citations (the footstool studies) have no link. */
  url?: string;
}

export const TOPIC_ORDER: TipTopic[] = [
  "routine",
  "food-drink",
  "movement",
  "posture",
  "stress-sleep",
  "travel",
  "loose",
  "get-checked",
];

export const TOPIC_LABEL: Record<TipTopic, string> = {
  routine: "Routine",
  "food-drink": "Food and drink",
  movement: "Movement",
  posture: "Posture",
  "stress-sleep": "Stress and sleep",
  travel: "Travel",
  loose: "Looser days",
  "get-checked": "When to get checked",
};

export const EVIDENCE_LABEL: Record<TipEvidence, string> = {
  strong: "Strong",
  moderate: "Moderate",
  limited: "Limited",
};

/** Only pages that were checked to say what the tip says. */
export const SOURCES: Record<string, TipSource> = {
  "niddk-constipation": {
    label: "NIDDK: Symptoms and causes of constipation",
    url: "https://www.niddk.nih.gov/health-information/digestive-diseases/constipation",
  },
  "niddk-diet": {
    label: "NIDDK: Eating, diet and nutrition for constipation",
    url: "https://www.niddk.nih.gov/health-information/digestive-diseases/constipation/eating-diet-nutrition",
  },
  "nhs-bowel-symptoms": {
    label: "NHS: Bowel cancer symptoms",
    url: "https://www.nhs.uk/conditions/bowel-cancer/symptoms/",
  },
  "footstool-studies": {
    label:
      "Two small studies: Digestive Diseases and Sciences (2003, 28 adults) and Journal of Clinical Gastroenterology (2019, 52 people)",
  },
};

export const TIPS: readonly Tip[] = [
  {
    id: "routine-after-meal",
    topic: "routine",
    audience: "any",
    evidence: "moderate",
    text: "Many people find the urge comes after breakfast or a warm drink. Give yourself five minutes then, no rush.",
  },
  {
    id: "routine-dont-wait",
    topic: "routine",
    audience: "hard",
    evidence: "moderate",
    text: "When the urge shows up, going soon is usually easier. Holding on can leave stool drier and harder.",
  },
  {
    id: "routine-no-scroll",
    topic: "routine",
    audience: "any",
    evidence: "moderate",
    text: "Five to ten minutes is plenty. If nothing happens, get up and try again later instead of straining.",
  },
  {
    id: "routine-same-times",
    topic: "routine",
    audience: "gap",
    evidence: "moderate",
    text: "Regular meal and sleep times tend to make bowel timing more predictable.",
  },
  {
    id: "routine-normal-range",
    topic: "routine",
    audience: "steady",
    evidence: "moderate",
    text: "Normal covers a wide range, from about three times a week to a few times a day. Your own pattern is what counts.",
  },
  {
    id: "fibre-gradual",
    topic: "food-drink",
    audience: "hard",
    evidence: "strong",
    text: "If you add fibre, add it a little at a time. Going up too fast can cause gas and bloating.",
    sourceId: "niddk-diet",
  },
  {
    id: "fibre-sources",
    topic: "food-drink",
    audience: "hard",
    evidence: "strong",
    text: "Whole grains, beans, lentils, fruit and vegetables all count. A mix works better than one big change.",
    sourceId: "niddk-diet",
  },
  {
    id: "fibre-needs-fluid",
    topic: "food-drink",
    audience: "hard",
    evidence: "strong",
    text: "Fibre works better with plenty of fluids. Sip through the day instead of all at once.",
    sourceId: "niddk-diet",
  },
  {
    id: "water-low-intake",
    topic: "food-drink",
    audience: "hard",
    evidence: "moderate",
    text: "Low fluid intake is linked with harder stool. A glass of water with each meal is an easy start.",
  },
  {
    id: "warm-drink",
    topic: "food-drink",
    audience: "gap",
    evidence: "limited",
    text: "Some people find a warm drink with breakfast helps get things moving.",
  },
  {
    id: "caffeine-urge",
    topic: "food-drink",
    audience: "any",
    evidence: "limited",
    text: "Coffee makes some people need to go sooner. If that's you, you can plan around it.",
  },
  {
    id: "loose-big-meals",
    topic: "loose",
    audience: "loose",
    evidence: "limited",
    text: "Large, greasy or very spicy meals may speed things up for some people. Smaller meals may help.",
  },
  {
    id: "loose-water",
    topic: "loose",
    audience: "loose",
    evidence: "moderate",
    text: "Loose stools can leave you low on fluids. Keep sipping water or clear soup through the day.",
  },
  {
    id: "loose-triggers",
    topic: "loose",
    audience: "loose",
    evidence: "limited",
    text: "Look at what came before: coffee, big meals, alcohol, stress. Your factor log may show a pattern.",
  },
  {
    id: "loose-persist",
    topic: "get-checked",
    audience: "loose",
    evidence: "strong",
    text: "Loose stools that last more than a few days, or come with fever, strong pain or blood, are worth a call to a doctor.",
  },
  {
    id: "walk-after-eating",
    topic: "movement",
    audience: "any",
    evidence: "moderate",
    text: "A 10-minute walk, especially after eating, can help keep things moving.",
  },
  {
    id: "move-when-sitting",
    topic: "movement",
    audience: "gap",
    evidence: "limited",
    text: "Long stretches of sitting slow things down for many people. Stand up and move every hour or so.",
  },
  {
    id: "footstool",
    topic: "posture",
    audience: "hard",
    evidence: "limited",
    text: "A small footstool, so your knees sit above your hips, helped some people strain less. Studies are small.",
    sourceId: "footstool-studies",
  },
  {
    id: "dont-strain",
    topic: "posture",
    audience: "hard",
    evidence: "moderate",
    text: "Straining doesn't help. Breathe out slowly, relax your belly and give it a few minutes.",
  },
  {
    id: "stress-breaths",
    topic: "stress-sleep",
    audience: "any",
    evidence: "moderate",
    text: "Stress can speed things up or slow them down. A few slow breaths before you sit can help you relax.",
  },
  {
    id: "sleep-steady",
    topic: "stress-sleep",
    audience: "gap",
    evidence: "limited",
    text: "Short or irregular sleep may throw bowel timing off. A steady bedtime may help.",
  },
  {
    id: "travel-routine",
    topic: "travel",
    audience: "any",
    evidence: "moderate",
    text: "Travel changes meals, sleep and bathrooms all at once, so a slow week is common. Water and walking still help.",
  },
  {
    id: "check-blood",
    topic: "get-checked",
    audience: "any",
    evidence: "strong",
    text: "Black or dark red stool, or a lot of blood, needs urgent medical care. Blood that keeps happening is worth seeing a doctor about.",
    sourceId: "nhs-bowel-symptoms",
  },
];

// Held back on purpose, not shipped (docs/TIPS.md):
//   check-lasting   contains "weight loss", which the text rules ban
//   travel-dont-hold  "limited" evidence without "some", "may" or "many people"

/** The tip shown for a sustained pattern. Absent from TIPS until its wording is approved. */
export const SUSTAINED_TIP_ID = "check-lasting";

export const tipById = (id: string, library: readonly Tip[] = TIPS): Tip | undefined =>
  library.find((t) => t.id === id);
