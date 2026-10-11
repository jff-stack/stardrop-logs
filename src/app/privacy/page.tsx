import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import { NEVER_SHARED } from "@/lib/friends";

export const metadata = { title: "Privacy" };

const POINTS = [
  {
    title: "What we store",
    body: "Your email, a display name, your gender, your birthday (only to check you're 18+), your timezone, the avatar you build, and the logs and quiet days you add. If you use friends: who your friends are, and nudges for up to a week.",
  },
  {
    title: "Who can see it",
    body: "Only you, unless you add friends and choose to share (see below). Every table is locked with row-level security in the database, so even a bug in the app can't show your logs to someone else.",
  },
  {
    title: "What friends can see",
    body: "Nothing, until you add a friend and pick a sharing level. Friends are added by invite link only; nobody can search for you. A friend always sees your display name and your avatar, and so does someone you've sent a friend request to. If you choose 'That I checked in', they also see whether you logged today and your best streak badge. If you choose 'How many, too', they also see how many logs you made today and on each of the last 7 days. You can switch it off again in Settings at any time.",
  },
  {
    title: "What friends can never see",
    body: NEVER_SHARED,
  },
  {
    title: "Nudges, muting and blocking",
    body: "Nudges are a handful of preset messages, never free text. You can turn them off, mute one friend, or block someone. Nobody is told when you do.",
  },
  {
    title: "No ads, no selling, no tracking",
    body: "There are no analytics or ad trackers in the app, and your data is never sold or shared.",
  },
  {
    title: "Take it with you",
    body: "You can export all your data at any time. Settings > Your data downloads every log and quiet day as a CSV file, or everything including your profile as a JSON file.",
  },
  {
    title: "Delete it all",
    body: "Settings > Delete account removes your account and every log, permanently, straight away.",
  },
  {
    title: "Not medical advice",
    body: "Stardrop Logs is a wellness diary, not a medical service, and can't diagnose or treat anything. For any health worry (blood, black or pale stool, pain, or days without going), please see a doctor. The full disclaimer is at /disclaimer.",
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
