// The first-visit tour: its steps and a "seen it" flag.
// The flag lives in localStorage. It's only a convenience: if it's lost, the
// worst case is the tour shows again for someone with no logs yet.
import type { TourStep } from "@/components/tour/Tour";
import { heyFor, type Gender } from "./greeting";

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

export function gardenTour(name: string, gender: Gender, canQuiet: boolean): TourStep[] {
  const steps: TourStep[] = [
    {
      title: heyFor(gender),
      body: `Welcome, ${name}! Your garden is ready. Here's a quick tour, it takes about half a minute.`,
      mia: "celebrate",
    },
    { target: "mia", title: "That's me!", body: "Tap me any time for tips and little pep talks.", mia: "help" },
    {
      target: "today",
      title: "Log every time you go",
      body: "Once, twice, three times a day, all fine. I'll point out anything worth showing a doctor.",
      mia: "inspect",
    },
  ];
  if (canQuiet) {
    steps.push({
      target: "quiet",
      title: "No movement today?",
      body: "Tap Quiet day before bed. It counts as a check-in. Forgot? You can mark yesterday too.",
      mia: "idle",
    });
  }
  steps.push(
    {
      target: "streak",
      title: "Build a streak",
      body: "Check in each day to keep it going and earn badges like Sprout and Stardrop. \"See all badges\" opens the whole shelf.",
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
      body: "Insights has a calendar of every day you've logged, your weeks side by side, and which habits seem to help.",
      mia: "inspect",
    },
    {
      target: "friends",
      title: "Garden friends, if you like",
      body: "Send someone your link to be friends, and say hi with a nudge. You pick what they can see, and it's never what you logged.",
      mia: "help",
    },
    {
      target: "account",
      title: "Make it yours",
      body: "That little face is you! Settings is where you build your avatar, change your name and choose what friends see.",
      mia: "celebrate",
    },
    { title: "You're all set!", body: "Ready to plant your very first log?", mia: "celebrate" },
  );
  return steps;
}
