"use client";

// The client halves of the auth pages.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useSyncExternalStore } from "react";
import Field, { FormMessage } from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import BirthdayPicker from "@/components/forms/BirthdayPicker";
import GenderPicker from "@/components/forms/GenderPicker";
import { updatePassword } from "@/app/actions/auth";
import {
  requestResetInBrowser, resendConfirmationInBrowser, signInInBrowser, signUpInBrowser, type FormState,
} from "@/lib/auth-client";
import { lastSentAt, pendingEmail, secondsLeft, subscribePending } from "@/lib/pending-confirm";

const initial: FormState = {};

export function SignUpForm() {
  const router = useRouter();
  const [state, action] = useActionState((_: FormState, fd: FormData) => signUpInBrowser(fd, router), initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage error={state.error} />
      <Field label="What should Mia call you?" name="display_name" autoComplete="nickname" maxLength={24} placeholder="Farmer" errors={fe.display_name} />
      <GenderPicker errors={fe.gender} />
      <Field label="Email" name="email" type="email" autoComplete="email" required errors={fe.email} />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        hint="At least 8 characters."
        errors={fe.password}
      />
      <BirthdayPicker errors={fe.dob} />
      <label className="flex items-start gap-3 text-[16px]">
        <input type="checkbox" name="agree" className="mt-1 size-5 shrink-0 accent-[#4fc489]" required />
        <span>
          I understand Stardrop Logs is a wellness diary, <strong>not a medical service</strong>. It can&apos;t
          diagnose or treat anything, and for any health concern I&apos;ll see a real doctor. I&apos;ve read the{" "}
          <Link href="/disclaimer" className="underline underline-offset-2">medical disclaimer</Link> and{" "}
          <Link href="/privacy" className="underline underline-offset-2">privacy notes</Link>.
        </span>
      </label>
      {fe.agree && <span className="-mt-2 text-[15px] font-semibold text-pink-deep">{fe.agree[0]}</span>}
      <SubmitButton pendingText="Planting your farm…">Create my garden</SubmitButton>
    </form>
  );
}

export function LoginForm({ next, verified = false }: Readonly<{ next?: string; verified?: boolean }>) {
  const router = useRouter();
  const [state, action] = useActionState((_: FormState, fd: FormData) => signInInBrowser(fd, router), initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage error={state.error} message={verified ? "Email verified. Sign in to continue." : undefined} />
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field label="Email" name="email" type="email" autoComplete="email" required errors={fe.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required errors={fe.password} />
      <SubmitButton pendingText="Opening the gate…">Sign in</SubmitButton>
      <p className="-mt-1 text-center text-[15px] text-plum-soft">
        You&apos;ll stay signed in on this browser until you sign out. Using a shared computer? Sign out when you&apos;re done.
      </p>
      <Link href="/forgot" className="self-center text-[16px] underline underline-offset-4">
        Forgot your password?
      </Link>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState((_: FormState, fd: FormData) => requestResetInBrowser(fd), initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage error={state.error} message={state.message} />
      <Field label="Email" name="email" type="email" autoComplete="email" required errors={fe.email} />
      <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

// Ticks once a second while mounted. null on the server and during
// hydration, so the countdown can't mismatch.
const subscribeSecond = (onChange: () => void) => {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
};
const thisSecond = () => Math.floor(Date.now() / 1000);

/** Asks for another confirmation email, at most once a minute. */
export function ResendForm() {
  const [state, action] = useActionState((_: FormState, fd: FormData) => resendConfirmationInBrowser(fd), initial);
  // Filled in by sign-up in this tab; empty if the page was opened elsewhere.
  const remembered = useSyncExternalStore(subscribePending, pendingEmail, () => "");
  const sentAt = useSyncExternalStore(subscribePending, lastSentAt, () => 0);
  const second = useSyncExternalStore(subscribeSecond, thisSecond, () => null);
  const wait = second === null ? 0 : secondsLeft(sentAt, second * 1000);

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage error={state.error} message={state.message} />
      <Field
        // Remount when the remembered address arrives so it shows in the box.
        key={remembered}
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email ?? remembered}
        errors={state.fieldErrors?.email}
      />
      <SubmitButton pendingText="Sending…" color="lilac" disabled={wait > 0}>
        {wait > 0 ? `Send again in ${wait}s` : "Resend confirmation"}
      </SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(updatePassword, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage error={state.error} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        hint="At least 8 characters."
        errors={fe.password}
      />
      <SubmitButton pendingText="Saving…">Save new password</SubmitButton>
    </form>
  );
}
