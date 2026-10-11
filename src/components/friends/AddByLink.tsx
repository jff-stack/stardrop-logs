"use client";

// What an invite link opens. Nothing happens until the button is pressed, so
// a link preview or a scanner fetching the page can't send a request. The
// page never says whose link it is, or whether the link is real, until the
// request has actually been tried.
import Link from "next/link";
import { useState, useTransition } from "react";
import SharingExplainer from "./SharingExplainer";
import { FormMessage } from "@/components/forms/Field";
import { buttonClass } from "@/components/ui/PixelButton";
import { sendFriendRequest, type FriendResult } from "@/app/actions/friends";

interface AddByLinkProps {
  /** The last part of the link, as it arrived. The server checks it. */
  code: string;
  /** Has this person already chosen what friends can see? */
  sharingSeen: boolean;
  acceptNudges: boolean;
}

export default function AddByLink({ code, sharingSeen, acceptNudges }: Readonly<AddByLinkProps>) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FriendResult | null>(null);
  const [explaining, setExplaining] = useState(false);

  const send = () =>
    startTransition(async () => {
      setResult(await sendFriendRequest(code));
    });

  if (result?.ok) {
    return (
      <section className="pix-card pix-card--mint flex flex-col gap-3">
        <h2 className="text-[20px] font-bold">Done!</h2>
        <p role="status" className="text-[17px]">{result.message}</p>
        <Link href="/friends" className={`${buttonClass("mint")} w-full`}>Go to friends</Link>
      </section>
    );
  }

  if (explaining) {
    return (
      <SharingExplainer
        acceptNudges={acceptNudges}
        onCancel={() => setExplaining(false)}
        onDone={() => {
          setExplaining(false);
          send();
        }}
      />
    );
  }

  return (
    <section className="pix-card pix-card--lilac flex flex-col gap-3" aria-labelledby="add-by-link-title">
      <h2 id="add-by-link-title" className="text-[20px] font-bold">Add a friend?</h2>
      <p className="text-[17px]">
        Someone shared their invite link with you. Send them a friend request? They&apos;ll need to say yes.
      </p>
      <FormMessage error={result && !result.ok ? result.error : undefined} />
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() => (sharingSeen ? send() : setExplaining(true))}
        className={`${buttonClass("mint")} w-full`}
      >
        {pending ? "Sending…" : "Send friend request"}
      </button>
      <Link href="/friends" className="self-center text-[16px] underline underline-offset-4">
        Not now
      </Link>
    </section>
  );
}
