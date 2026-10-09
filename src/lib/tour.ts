// The first-visit tour: its steps and a "seen it" flag.
// The flag lives in localStorage. It's only a convenience: if it's lost, the
// worst case is the tour shows again for someone with no logs yet.
import type { TourStep } from "@/components/tour/Tour";

const KEY = "stardrop:tour-done";

export function tourSeen(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markTourSeen() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    // private mode etc. Nothing to do.
  }
}

export function gardenTour(name: string, canQuiet: boolean): TourStep[] {
  const steps: TourStep[] = [
    {
      title: `Welcome, ${name}!`,
      body: "Your garden is ready. Here's a quick tour, it takes about 20 seconds.",
      mia: "celebrate",
    },
    { target: "mia", title: "That's me!", body: "Tap me any time for tips and little pep talks.", mia: "help" },
    {
      target: "today",
      title: "Log every time you go",
      body: "Once, twice, three times a day, all fine. I'll tell you if the count looks normal.",
      mia: "inspect",
    },
  ];
  if (canQuiet) {
    steps.push({
      target: "quiet",
      title: "No movement today?",
      body: "Tap Quiet day before bed. It still counts for your streak.",
      mia: "idle",
    });
  }
  steps.push(
    {
      target: "streak",
      title: "Build a streak",
      body: "Check in each day to keep it going and earn badges like Sprout and Stardrop.",
      mia: "celebrate",
    },
    {
      target: "garden",
      title: "Watch it grow",
      body: "Each day becomes a plot. Healthy days grow parsnips, then pumpkins, then stardrops!",
      mia: "help",
    },
    {
      target: "insights",
      title: "See what helps",
      body: "Insights shows your weeks side by side and which habits seem to help.",
      mia: "inspect",
    },
    { title: "You're all set!", body: "Ready to plant your very first log?", mia: "celebrate" },
  );
  return steps;
}
