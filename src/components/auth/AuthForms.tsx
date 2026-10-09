"use client";

// The client halves of the auth pages.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import Field, { FormMessage } from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import BirthdayPicker from "@/components/forms/BirthdayPicker";
import { updatePassword } from "@/app/actions/auth";
import {
  requestResetInBrowser, signInInBrowser, signUpInBrowser, type FormState,
} from "@/lib/auth-client";

const initial: FormState = {};

export function SignUpForm() {
  const router = useRouter();
  const [state, action] = useActionState((_: FormState, fd: FormData) => signUpInBrowser(fd, router), initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage error={state.error} />
      <Field label="What should Mia call you?" name="display_name" autoComplete="nickname" maxLength={24} placeholder="Farmer" errors={fe.display_name} />
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
          I understand Stardrop Logs is a wellness diary, not medical advice, and I&apos;ve read the{" "}
          <Link href="/privacy" className="underline underline-offset-2">privacy notes</Link>.
        </span>
      </label>
      {fe.agree && <span className="-mt-2 text-[15px] font-semibold text-pink-deep">{fe.agree[0]}</span>}
      <SubmitButton pendingText="Planting your farm…">Create my garden</SubmitButton>
    </form>
  );
}

export function LoginForm({ next }: Readonly<{ next?: string }>) {
  const router = useRouter();
  const [state, action] = useActionState((_: FormState, fd: FormData) => signInInBrowser(fd, router), initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage error={state.error} />
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field label="Email" name="email" type="email" autoComplete="email" required errors={fe.email} />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required errors={fe.password} />
      <SubmitButton pendingText="Opening the gate…">Sign in</SubmitButton>
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
