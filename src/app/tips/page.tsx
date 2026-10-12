import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import MedicalNote from "@/components/legal/MedicalNote";
import {
  EVIDENCE_LABEL, SOURCES, TIPS, TOPIC_LABEL, TOPIC_ORDER,
} from "@/lib/tip-library";

export const metadata = { title: "Everyday tips" };

// Public and static: every tip the app can show, with how well supported it
// is and where it comes from. Works signed out, and for /try visitors.
export default function TipsPage() {
  return (
    <AuthShell
      title="Everyday tips"
      subtitle="Habits many people find helpful. Not treatment."
      mia="inspect"
      footer={<Link href="/" className="underline underline-offset-4">Back to the garden</Link>}
    >
      {/* AuthShell's card is light, so the note needs the card's own text colour. */}
      <MedicalNote className="!text-plum bg-cream-2 py-2" />

      <p className="text-[16px]">
        In the app, tips are picked from your own logs, on your device. Nothing about which ones you saw is sent
        anywhere. <strong>Evidence</strong> says how well supported a tip is: Strong, Moderate or Limited.
      </p>

      <div className="flex flex-col gap-6">
        {TOPIC_ORDER.map((topic) => {
          const tips = TIPS.filter((t) => t.topic === topic);
          if (tips.length === 0) return null;
          return (
            <section key={topic} aria-labelledby={`topic-${topic}`} className="flex flex-col gap-3">
              <h2 id={`topic-${topic}`} className="text-[20px] font-bold">{TOPIC_LABEL[topic]}</h2>
              <ul className="flex flex-col gap-3">
                {tips.map((t) => {
                  const source = t.sourceId ? SOURCES[t.sourceId] : undefined;
                  return (
                    <li key={t.id} className="bg-cream-2 px-3 py-2.5">
                      <p className="text-[17px] leading-snug">{t.text}</p>
                      <p className="mt-1 text-[14px] text-plum-soft">
                        Evidence: {EVIDENCE_LABEL[t.evidence]}
                        {source && (
                          <>
                            {" · "}
                            {source.url ? (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-4"
                              >
                                {source.label}
                              </a>
                            ) : (
                              source.label
                            )}
                          </>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="text-[15px] text-plum-soft">
        Turn tips and reminders off any time in <Link href="/settings" className="underline underline-offset-4">Settings</Link>.
      </p>
    </AuthShell>
  );
}
