import { notFound } from "next/navigation";
import FriendsView from "@/components/friends/FriendsView";
import AddByLink from "@/components/friends/AddByLink";
import TopNav from "@/components/nav/TopNav";
import type { FriendsData } from "@/lib/data/friends";
import { resolveAvatar } from "@/lib/avatar/compose";

// Dev-only preview of the Friends screen with made-up people, so it can be
// checked without accounts. The buttons call the real actions, which answer
// "session ran out" when nobody is signed in. 404s in production.
const DATA: FriendsData = {
  available: true,
  me: { friendCode: "ABCD2345", shareLevel: "active", acceptNudges: true, sharingSeen: false },
  friends: [
    { friend_id: "00000000-0000-4000-8000-000000000003", name: "Sam", share_level: "counts", logged_today: true, today_count: 2, week_counts: [1, 0, 2, 1, 0, 1, 2], best_badge: "streak-30" },
    { friend_id: "00000000-0000-4000-8000-000000000001", name: "Ada", share_level: "active", logged_today: true, today_count: null, week_counts: null, best_badge: "streak-7" },
    { friend_id: "00000000-0000-4000-8000-000000000002", name: "bea", share_level: "active", logged_today: false, today_count: null, week_counts: null, best_badge: null },
    { friend_id: "00000000-0000-4000-8000-000000000004", name: "Zed", share_level: "off", logged_today: null, today_count: null, week_counts: null, best_badge: null },
  ],
  requests: [
    { id: "00000000-0000-4000-8000-000000000011", direction: "incoming", user_id: "00000000-0000-4000-8000-000000000005", name: "Cy" },
    { id: "00000000-0000-4000-8000-000000000012", direction: "outgoing", user_id: "00000000-0000-4000-8000-000000000006", name: "Dee" },
  ],
  muted: ["00000000-0000-4000-8000-000000000002"],
  blocked: [{ user_id: "00000000-0000-4000-8000-000000000007", name: "Eli" }],
  // Sam made one; everyone else gets the default worked out from their id.
  avatars: {
    "00000000-0000-4000-8000-000000000003": resolveAvatar(
      { hair: "hair_curly", hairColor: "hc_9", skin: "skin_5", outfit: "outfit_hoodie", outfitColor: "oc_4", eyes: "eyes_happy", accessory: "acc_glasses", bg: "bg_5" },
      "00000000-0000-4000-8000-000000000003",
    ),
  },
};

export default function FriendsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-16 pt-5">
      <h1 className="pix-title text-center text-[26px] leading-none">Friends preview</h1>
      <TopNav />
      <FriendsView data={DATA} />
      <h2 className="pix-title text-center text-[22px] leading-none">Invite link page</h2>
      <AddByLink code="ABCD2345" sharingSeen={false} acceptNudges />
    </main>
  );
}
