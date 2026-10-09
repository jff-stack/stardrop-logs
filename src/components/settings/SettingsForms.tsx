"use client";

import { useActionState, useState } from "react";
import Field, { FormMessage } from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import GenderPicker from "@/components/forms/GenderPicker";
import type { Gender } from "@/lib/greeting";
import { deleteAccount, updateProfile, type FormState } from "@/app/actions/auth";

const initial: FormState = {};

export function ProfileForm({ displayName, gender }: Readonly<{ displayName: string; gender: Gender }>) {
  const [state, action] = useActionState(updateProfile, initial);
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage error={state.error} message={state.message} />
      <Field
        label="Name"
        name="display_name"
        defaultValue={displayName}
        maxLength={24}
        required
        errors={state.fieldErrors?.display_name}
      />
      <GenderPicker defaultValue={gender} errors={state.fieldErrors?.gender} />
      <SubmitButton pendingText="Saving…" color="mint">Save</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, initial);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="pix-btn pix-btn--cream w-full">
        Delete my account…
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage error={state.error} />
      <p className="text-[16px]">
        This permanently deletes your account, every log and every quiet day. It can&apos;t be undone.
        Maybe export your data first?
      </p>
      <Field
        label='Type "DELETE" to confirm'
        name="confirm"
        autoComplete="off"
        autoCapitalize="characters"
        errors={state.fieldErrors?.confirm}
      />
      <SubmitButton pendingText="Deleting…" color="pink">Delete everything</SubmitButton>
      <button type="button" onClick={() => setOpen(false)} className="text-[16px] underline underline-offset-4">
        Never mind
      </button>
    </form>
  );
}
