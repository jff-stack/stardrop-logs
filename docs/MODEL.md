# Personalised pattern model (planned)

Down the line, Stardrop Logs could learn each person's own rhythm: when they
usually go, what's normal *for them*, and which habits seem to help. The app
doesn't do any of that yet. This page explains the space that's already set
aside for it and the rules it has to follow.

**Status:** placeholder only. Nothing in the app imports `src/lib/model`, no
extra data is collected, and nothing is sent anywhere.

## What's there now

```
src/lib/model/
  types.ts       PatternModel interface + the DayFeatures / PatternGuess shapes
  features.ts    logs -> one small record per day (no notes, no ids)
  baseline.ts    a no-training model: medians and averages
  index.ts       getPatternModel(): the one place to swap models
  model.test.ts  tests, including "notes never reach the model"
```

```ts
import { dailyFeatures, getPatternModel } from "@/lib/model";

const days = dailyFeatures(logs, quietDays, new Date());
const guess = getPatternModel().predict(days);
// { perDay: 1.2, usualHour: 8, typicalType: 4, healthyShare: 0.7, confidence: "medium" }
```

The baseline is the yardstick: a trained model only replaces it if it does
clearly better on held-out days.

## Rules for any future model

1. **Opt-in only.** Nobody's data is used for training unless they turn it on
   in Settings, and they can turn it off (and have their data removed from
   future training) at any time. Off by default.
2. **Features, not diaries.** Models only ever see `DayFeatures`. Free-text
   notes, emails, names and birthdays never go in.
3. **Personal first.** Start with per-person models that run in the browser
   or as the user (under RLS). A shared model trained across people needs its
   own de-identified dataset, a privacy review, and an updated privacy page.
4. **Not medical advice.** Predictions are phrased as "your usual", never as
   a diagnosis. Red-flag advice (blood, black or pale stool, long gaps) stays
   rule-based and always wins over a model.
5. **No new third parties** without updating the privacy page and the CSP in
   `next.config.ts`.

## Rough roadmap

1. Show the baseline in the app ("you usually go around 8am") behind a flag.
2. Add an opt-in column (e.g. `profiles.share_patterns boolean default false`)
   with a migration, RLS, and a Settings toggle.
3. Try small per-person models (seasonality by weekday, habit effects) and
   compare against the baseline.
4. Only then think about anything shared across users.
