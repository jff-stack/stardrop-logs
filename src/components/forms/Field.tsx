import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
}

// Label + pixel input + inline error, wired up for screen readers.
export default function Field({ label, name, errors, hint, ...input }: Readonly<FieldProps>) {
  const errorId = errors?.length ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[17px] font-semibold">{label}</span>
      <input
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        className="pix-well min-h-[50px] px-3 text-[18px] outline-offset-2"
        {...input}
      />
      {hint && (
        <span id={hintId} className="text-[14px] text-plum-soft">
          {hint}
        </span>
      )}
      {errors?.length ? (
        <span id={errorId} className="text-[15px] font-semibold text-pink-deep">
          {errors[0]}
        </span>
      ) : null}
    </label>
  );
}

export function FormMessage({ error, message }: Readonly<{ error?: string; message?: string }>) {
  if (error) {
    return (
      <p role="alert" className="bg-[#ffe1ec] px-3 py-2 text-[16px]">
        {error}
      </p>
    );
  }
  if (message) {
    return (
      <p role="status" className="bg-[#e3fbee] px-3 py-2 text-[16px]">
        {message}
      </p>
    );
  }
  return null;
}
