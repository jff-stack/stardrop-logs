// The small "not medical advice" note at the bottom of the main screens.
import Link from "next/link";
import { MEDICAL_NOTE } from "@/lib/constants";

export default function MedicalNote({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <p className={`px-2 text-center text-[14px] leading-snug text-cream ${className}`}>
      {MEDICAL_NOTE}{" "}
      <Link href="/disclaimer" className="font-bold underline underline-offset-4">
        Read more
      </Link>
    </p>
  );
}
