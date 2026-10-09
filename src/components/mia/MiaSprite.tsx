"use client";

// Mia, animated. The frame strip comes from chibi.ts and GSAP steps through
// it, while the wrapper layers handle bobbing, hopping and pacing.
//
//   <MiaSprite state="idle" />
//   <MiaSprite state="celebrate" ref={mia} />   then mia.current?.burst()
//
// With reduced motion on she just holds the first frame of each state.
import { useImperativeHandle, useRef, type CSSProperties, type Ref } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import {
  CHIBI_FRAMES, CHIBI_H, CHIBI_INDEX, CHIBI_ORDER, CHIBI_W, MIA_PALETTE,
} from "@/lib/mia/chibi";
import { MIA_ANIMATIONS, type MiaState } from "@/lib/mia/animations";
import { pixelStripDataUri } from "@/components/ui/PixelArt";
import ParticleBurst, {
  type BurstOptions,
  type ParticleBurstHandle,
} from "@/components/fx/ParticleBurst";

gsap.registerPlugin(useGSAP);

/** Built once per module load: every chibi frame packed into one SVG strip. */
const STRIP = pixelStripDataUri(CHIBI_ORDER.map((n) => CHIBI_FRAMES[n]), MIA_PALETTE);

/** Quick squash-and-stretch on an element (no-op under reduced motion). */
function boingEl(el: HTMLElement | null) {
  if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.fromTo(
    el,
    { scaleX: 1.2, scaleY: 0.8 },
    { scaleX: 1, scaleY: 1, duration: 0.6, ease: "elastic.out(1.3, 0.35)", overwrite: "auto" },
  );
}

export interface MiaHandle {
  /** Emit a particle burst from just above Mia's head. */
  burst: (options?: BurstOptions) => void;
  /** A quick squash-and-stretch "boing" (e.g. when tapped). */
  boing: () => void;
}

interface MiaSpriteProps {
  state?: MiaState;
  /** Art-pixel scale. 4 -> 88×100px, 5 -> 110×125px. Whole numbers stay crisp. */
  scale?: number;
  /** How far (px) Mia toddles each way in the "pace" motion. */
  paceDistance?: number;
  className?: string;
  /** Accessible description; defaults to a description of the state. */
  label?: string;
  /** Tap handler; Mia also does a little boing on tap. */
  onTap?: () => void;
  ref?: Ref<MiaHandle>;
}

const STATE_LABELS: Record<MiaState, string> = {
  idle: "Mia smiling and blinking",
  help: "Mia waving hello",
  celebrate: "Mia cheering",
  checkin: "Mia toddling back and forth",
  inspect: "Mia thinking it over",
};

export default function MiaSprite({
  state = "idle",
  scale = 4,
  paceDistance = 50,
  className = "",
  label,
  onTap,
  ref,
}: Readonly<MiaSpriteProps>) {
  const width = CHIBI_W * scale;
  const height = CHIBI_H * scale;

  const rootRef = useRef<HTMLDivElement>(null);
  const moverRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const facingRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLButtonElement>(null);
  const fxRef = useRef<ParticleBurstHandle>(null);

  useGSAP(
    () => {
      const anim = MIA_ANIMATIONS[state];
      const seq = anim.frames.map((name) => CHIBI_INDEX[name]);
      const sprite = spriteRef.current!;
      const body = bodyRef.current!;
      const mover = moverRef.current!;
      const facing = facingRef.current!;
      const setFrame = (i: number) => sprite.style.setProperty("--frame", String(i));

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduce: "(prefers-reduced-motion: reduce)",
          animate: "(prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          // Reduced motion: one still frame, done.
          if (ctx.conditions?.reduce) {
            setFrame(seq[0]);
            return;
          }

          // 1. Frame loop
          // steps(n) makes the playhead jump between whole numbers only:
          // true flip-book sprite timing with no in-between values.
          const playhead = { f: 0 };
          setFrame(seq[0]);
          gsap.to(playhead, {
            f: seq.length,
            duration: seq.length / anim.fps,
            ease: `steps(${seq.length})`,
            repeat: -1,
            onUpdate: () => setFrame(seq[Math.min(seq.length - 1, Math.floor(playhead.f))]),
          });

          // 2. Entrance squash so state changes feel bouncy
          gsap.fromTo(
            body,
            { scaleX: 1.12, scaleY: 0.86 },
            { scaleX: 1, scaleY: 1, duration: 0.55, ease: "elastic.out(1.2, 0.4)" },
          );

          // 3. Body motion
          switch (anim.motion) {
            case "bob":
              // 2-step bob = classic pixel "breathing".
              gsap.to(body, { y: -scale, duration: 0.5, ease: "steps(1)", yoyo: true, repeat: -1 });
              break;

            case "hop":
              gsap
                .timeline({ repeat: -1, repeatDelay: 0.2 })
                .to(body, { y: -scale * 5, duration: 0.2, ease: "power2.out" })
                .to(body, { y: 0, duration: 0.17, ease: "power2.in" })
                .to(body, { scaleY: 0.86, scaleX: 1.12, duration: 0.06 })
                .to(body, { scaleY: 1, scaleX: 1, duration: 0.14, ease: "back.out(3)" });
              break;

            case "pace": {
              const speed = 40; // px per second, a little toddle
              const leg = (paceDistance * 2) / speed;
              gsap.set(mover, { x: -paceDistance });
              gsap
                .timeline({ repeat: -1 })
                .set(facing, { scaleX: 1 })
                .to(mover, { x: paceDistance, duration: leg, ease: "none" })
                .set(facing, { scaleX: -1 })
                .to(mover, { x: -paceDistance, duration: leg, ease: "none" });
              gsap.to(body, { y: -scale, duration: 0.17, ease: "steps(1)", yoyo: true, repeat: -1 });
              break;
            }

            case "tilt":
              gsap.to(body, { rotation: 5, duration: 1.2, ease: "steps(3)", yoyo: true, repeat: -1 });
              break;
          }

          // 4. Ambient particles
          // Origins sit beside/above her head (never on her face): x 0.05/0.95
          // are past her hair, y -0.05 is just above her crown.
          if (anim.particles === "sparkle") {
            let side = 0;
            gsap
              .timeline({ repeat: -1, repeatDelay: 1.3 })
              .call(() => {
                side = 1 - side;
                fxRef.current?.burst({ kind: "sparkle", count: 1, spread: 30, originX: side ? 0.98 : 0.02, originY: 0.08 });
              });
          } else if (anim.particles === "heart") {
            fxRef.current?.burst({ kind: "mixed", count: 16, spread: 110, originY: -0.05 });
            gsap
              .timeline({ repeat: -1, repeatDelay: 0.8 })
              .call(() => fxRef.current?.burst({ kind: "heart", count: 2, spread: 55, originY: -0.05 }));
          }
        },
      );
    },
    // Re-run (auto-reverting the previous state's tweens) when state changes.
    { dependencies: [state, paceDistance, scale], scope: rootRef, revertOnUpdate: true },
  );

  useImperativeHandle(ref, () => ({
    burst: (options) => fxRef.current?.burst({ originY: -0.05, ...options }),
    boing: () => boingEl(bodyRef.current),
  }), []);

  const handleTap = () => {
    boingEl(bodyRef.current);
    fxRef.current?.burst({ kind: "heart", count: 3, spread: 50, originY: -0.05 });
    onTap?.();
  };

  return (
    <div
      ref={rootRef}
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width, height }}
    >
      <div ref={moverRef} className="absolute inset-0">
        <span className="sprite-shadow" />
        <div ref={bodyRef} className="absolute inset-0 origin-bottom">
          <div ref={facingRef} className="h-full w-full">
            <button
              type="button"
              onClick={handleTap}
              aria-label={label ?? STATE_LABELS[state]}
              className="sprite-mia block cursor-pointer border-0 bg-transparent p-0"
              ref={spriteRef}
              style={
                {
                  backgroundImage: STRIP,
                  "--mia-w": `${width}px`,
                  "--mia-h": `${height}px`,
                  "--mia-frames": CHIBI_ORDER.length,
                } as CSSProperties
              }
            />
          </div>
        </div>
        <ParticleBurst ref={fxRef} />
      </div>
    </div>
  );
}
