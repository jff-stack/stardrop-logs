import PixelArt, { ICONS } from "@/components/ui/PixelArt";

/** Cozy placeholder shown while a Suspense boundary streams in. */
export default function LoadingCard({ text }: Readonly<{ text: string }>) {
  return (
    <div className="pix-card flex items-center justify-center gap-3 py-10 text-[18px]" role="status">
      <span className="animate-twinkle">
        <PixelArt grid={ICONS.sparkle} scale={4} />
      </span>
      {text}
    </div>
  );
}
