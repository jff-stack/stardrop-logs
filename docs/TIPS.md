# Everyday tips and reminders

Stardrop Logs shows one short, generic habit tip a day, picked from the
person's own logs, and an occasional in-app reminder near their usual time.
It is **not medical advice**: nothing here diagnoses, treats or predicts
anything, and the wording never names a condition.

Everything is chosen in the browser (`src/lib/coach.ts`), in the person's own
timezone. Nothing about which tip was shown or put away is sent anywhere or
logged beyond a short list of ids and dates in `localStorage`
(`src/lib/tip-store.ts`). The only thing stored on the server is whether the
person wants tips and reminders (`profiles.tips_enabled`,
`profiles.reminders_enabled`, migration 0008).

## Review before launch

**Any new or edited tip needs a clinician or dietitian to review it before it
ships.** Tip text lives in `src/lib/tip-library.ts` and `tip-library.test.ts`
enforces the rules below; passing the tests is not a review.

## Text rules (enforced by tests)

- 140 characters or fewer (up to 200 for the `get-checked` topic only).
- Unique ids.
- None of: laxative, softener, detox, cleanse, flush, supplement, magnesium,
  probiotic, diagnos*, cure, treat*, calorie, weight loss, fasting,
  constipated, IBS.
- Never "you have" or "you are" plus a condition.
- Evidence "limited" must say "some", "may" or "many people".
- Also by convention: no weight, diet or "empty yourself" language anywhere;
  never present a daily bowel movement as required; no praise for high
  frequency; no emoji; no guilt wording in reminders.

## How a tip is chosen

1. Quiet when Tips is off, when the latest log has a colour with its own
   message (`colorTip` keeps that job), or when a day above the usual ceiling
   (`NORMAL_MAX_PER_DAY`) has happened on two or more of the last seven days.
2. A sustained pattern (14+ days of history, 8+ logs, 70% or more types 1-2
   or 6-7): the `check-lasting` tip, once per 14 days. Never on a single log.
3. A recent pattern over the last five logs inside 14 days: hard (3+ are
   type 1-2), loose (3+ are type 6-7), a gap (longer than 1.5x the person's
   own median gap, never under 2 days), or steady (all five type 3-5). With
   fewer than five logs, only everyday tips.
4. A factor insight: 8+ days with and 8+ days without a factor in the last 60,
   average type differing by at least 0.5. Worded as a correlation.
5. Otherwise a rotating everyday tip, not repeated within 14 days.

Hard-audience tips are never shown for a loose pattern, nor the reverse.

## Reminders

In-app only (no push, no email). Reminders on, 7+ logs in 30 days, a steady
time of day (circular median absolute deviation of 90 minutes or less, so
23:50 and 00:10 count as one habit), now within 45 minutes of it, no log or
quiet day today, and not put away today. An irregular pattern shows nothing.

## Sources

Only pages that were opened and read to confirm what they say are linked:

| Source | Backs |
| --- | --- |
| NIDDK, Eating, diet and nutrition for constipation | `fibre-gradual` (gradual increase; the page does not mention gas or bloating), `fibre-sources`, `fibre-needs-fluid` |
| NHS, Bowel cancer symptoms | `check-blood` (black or dark red stool, a lot of blood; "keeps happening" is not on the page) |
| Two small footstool studies (Digestive Diseases and Sciences 2003, 28 adults; Journal of Clinical Gastroenterology 2019, 52 people) | `footstool` (plain-text citation, no link) |
| NIDDK, Symptoms and causes of constipation | not attached to a tip: it describes fewer than three a week as a sign of constipation but says nothing about what is normal, the urge, fluids or straining |

Tips with no source have no page that was checked to say what they say; they
are marked by their evidence level only.

## Held back (not shipped)

- `check-lasting`: contains "weight loss", which the text rules ban. The
  sustained-pattern rule is built and tested but shows nothing until approved
  wording exists. One reworded candidate for review, not shipped:
  "A change in your bowel habit that lasts three weeks or more is worth
  mentioning to a doctor, especially with belly pain or unusual tiredness."
- `travel-dont-hold`: "limited" evidence without "some", "may" or "many
  people". Needs a hedge ("may backfire") or a stronger source.
