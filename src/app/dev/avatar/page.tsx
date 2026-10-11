import { notFound } from "next/navigation";
import Avatar from "@/components/avatar/Avatar";
import AvatarEditor from "@/components/avatar/AvatarEditor";
import { defaultAvatar } from "@/lib/avatar/compose";

// Dev-only preview of the avatar editor, plus a row of default avatars at the
// sizes the app uses. Save answers "session ran out" when nobody is signed
// in. 404s in production.
const USER = "00000000-0000-4000-8000-000000000001";

export default function AvatarPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pb-16 pt-5">
      <h1 className="pix-title text-center text-[26px] leading-none">Avatar preview</h1>
      <div className="pix-card flex flex-wrap items-end gap-3">
        {[24, 28, 32, 40, 48, 72].map((size) => (
          <Avatar key={size} config={defaultAvatar(`size-${size}`)} size={size} title={`${size}px`} />
        ))}
      </div>
      <AvatarEditor initial={defaultAvatar(USER)} userId={USER} backHref="/dev/avatar" />
    </main>
  );
}
