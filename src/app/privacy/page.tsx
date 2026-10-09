import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";

export const metadata = { title: "Privacy" };

const POINTS = [
  {
    title: "What we store",
    body: "Your email, a display name, your birthday (only to check you're 18+), and the logs and quiet days you add.",
  },
  {
    title: "Who can see it",
    body: "Only you. Every table is locked with row-level security in the database, so even a bug in the app can't show your logs to someone else.",
  },
  {
    title: "No ads, no selling, no tracking",
    body: "There are no analytics or ad trackers in the app, and your data is never sold or shared.",
  },
  {
    title: "Take it with you",
    body: "Settings > Export gives you every log as a CSV file whenever you like.",
  },
  {
    title: "Delete it all",
    body: "Settings > Delete account removes your account and every log, permanently, straight away.",
  },
  {
    title: "Not medical advice",
    body: "Stardrop Logs is a wellness diary. If something worries you (blood, black or pale stool, pain, or days without going), please talk to a doctor.",
  },
];

export default function PrivacyPage() {
  return (
    <AuthShell title="Privacy, plainly" subtitle="The short version of how your data is handled." mia="inspect"
      footer={<Link href="/" className="underline underline-offset-4">Back to the garden</Link>}
    >
      <ul className="flex flex-col gap-4">
        {POINTS.map((p) => (
          <li key={p.title}>
            <h2 className="text-[19px] font-bold">{p.title}</h2>
            <p className="text-[17px]">{p.body}</p>
          </li>
        ))}
      </ul>
    </AuthShell>
  );
}
