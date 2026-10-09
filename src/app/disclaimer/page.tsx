import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";

export const metadata = { title: "Not medical advice" };

// Plain-English medical disclaimer, linked from sign-up and every screen.
const SEE_A_DOCTOR = [
  "Blood in or on your stool, or red, black or tarry stool",
  "Pale, clay-coloured or greasy stool",
  "Belly pain that's strong, or doesn't go away",
  "Diarrhea lasting more than 2 days, or signs of dehydration",
  "No bowel movement for several days with discomfort or bloating",
  "Fever, vomiting, or losing weight without trying",
  "Any change in your habits that lasts more than a couple of weeks",
  "Anything at all that worries you",
];

export default function DisclaimerPage() {
  return (
    <AuthShell
      title="Not medical advice"
      subtitle="Please read this. It's short, and it matters."
      mia="inspect"
      footer={<Link href="/" className="underline underline-offset-4">Back to the garden</Link>}
    >
      <div className="flex flex-col gap-4 text-[17px]">
        <p>
          Stardrop Logs is a <strong>wellness diary</strong>. It helps you keep notes and spot patterns.
          It is <strong>not a medical device or service</strong>, and nobody here is a doctor.
        </p>
        <p>
          Nothing in the app (Mia&apos;s tips, the &quot;is this normal?&quot; notes, the charts or the
          suggestions) is a diagnosis or treatment, and none of it replaces advice from a
          qualified health professional. Never delay or skip seeing a doctor because of something
          you read here.
        </p>

        <section className="bg-cream-2 px-3 py-3">
          <h2 className="text-[19px] font-bold">Please see a doctor if you notice</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[16px]">
            {SEE_A_DOCTOR.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <p className="bg-[#ffe1ec] px-3 py-2.5 font-semibold">
          In an emergency (severe pain, heavy bleeding, fainting, or feeling very unwell), call your
          local emergency number or go to the nearest emergency department straight away.
        </p>

        <p className="text-[16px] text-plum-soft">
          Your logs can be handy to show your doctor. Settings &gt; Export downloads them as a spreadsheet.
        </p>
      </div>
    </AuthShell>
  );
}
