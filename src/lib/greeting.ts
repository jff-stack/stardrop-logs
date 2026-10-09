// How Mia says hello. Gender is only ever used for this one word.
export const GENDERS = ["female", "male", "other"] as const;
export type Gender = (typeof GENDERS)[number];

export const GENDER_OPTIONS: { value: Gender; label: string; hey: string }[] = [
  { value: "female", label: "Female", hey: "Hey Queen!" },
  { value: "male", label: "Male", hey: "Hey Buddy!" },
  { value: "other", label: "Other", hey: "Hey there!" },
];

export const isGender = (v: unknown): v is Gender => GENDERS.includes(v as Gender);

/** "Hey Queen!" / "Hey Buddy!" / "Hey there!" */
export function heyFor(gender: Gender | null | undefined): string {
  return GENDER_OPTIONS.find((g) => g.value === gender)?.hey ?? "Hey there!";
}
