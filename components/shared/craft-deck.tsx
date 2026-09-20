"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * The six crafts as a rotating card deck on a single circular arc.
 *
 * Every card sits on one shared invisible circle -- one centre, one radius --
 * and its position is sin and cos of its own angle. That is what makes the
 * motion read as a physical conveyor rather than a list of separately animated
 * rows: spacing and curvature stay consistent everywhere because they are
 * consequences of the same equation rather than values chosen per card.
 *
 * WHY THE WHEEL CAPTURE IS SCOPED
 *
 * The brief asked for the wheel anywhere in the viewport to turn the deck. That
 * belongs to a page which is only this. Dropped into a page that scrolls, it
 * traps anyone trying to reach what is underneath -- and because the deck loops
 * endlessly there is no end of travel to hand the page back at. So the wheel is
 * taken only while the pointer is over the stage, which is a bounded box: move
 * off it and the page scrolls normally.
 *
 * Positions are written straight to the DOM inside the frame loop. React
 * renders only when the slot-to-craft mapping changes, a few times a second
 * rather than sixty.
 */

type Tone = "ink" | "paper" | "brand";

const CRAFTS: {
  name: string;
  slug: string;
  img: string;
  label: string;
  line: string;
  tone: Tone;
}[] = [
  {
    name: "Photography",
    slug: "photography",
    img: "/marketing/cat-photography.webp",
    label: "Stills",
    line: "Weddings, events, product, portraits.",
    tone: "ink",
  },
  {
    name: "Videography",
    slug: "videography",
    img: "/marketing/cat-videography.webp",
    label: "Motion",
    line: "Ceremonies, brand films, live capture.",
    tone: "paper",
  },
  {
    name: "Video editing",
    slug: "video-editing",
    img: "/marketing/cat-video-editing.webp",
    label: "Post",
    line: "Cuts, colour, sound, delivery.",
    tone: "ink",
  },
  {
    name: "Photo editing",
    slug: "photo-editing",
    img: "/marketing/cat-photo-editing.webp",
    label: "Retouch",
    line: "Culling, grading and retouching at volume.",
    tone: "paper",
  },
  {
    name: "Motion graphics",
    slug: "motion-graphics",
    img: "/marketing/cat-motion-graphics.webp",
    label: "Animation",
    line: "Titles, lower thirds, explainers.",
    tone: "brand",
  },
  {
    name: "Drone & aerial",
    slug: "drone-aerial",
    img: "/marketing/cat-drone-aerial.webp",
    label: "Aerial",
    line: "Venues, property, landscape coverage.",
    tone: "ink",
  },
];

const N = CRAFTS.length;

/* ---- Geometry. One circle; everything else follows from it. ---- */
const STEP = (10.5 * Math.PI) / 180;
const POOL = 15; // rendered instances, well past the visible arc
const HALF = (POOL - 1) / 2;
const RADIUS_FACTOR = 2.55; // radius as a multiple of card width: broad, shallow
const CARD_W_RATIO = 0.915;
const CARD_ASPECT = 1.75;

/* ---- Presentation loop: 2.10 down, 1.62 hold, 1.58 back = 5.30s ---- */
const T_DOWN = 2100;
const T_HOLD = 1620;
const T_UP = 1580;
const T_LOOP = T_DOWN + T_HOLD + T_UP;

const WHEEL_COOLDOWN = 420;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function CraftDeck({
  className,
  /**
   * Whether the wheel belongs to the deck.
   *
   * On a page that is only this, true: the wheel turns the deck and the page
   * holds still. Embedded in a page with content underneath, false: the wheel
   * still turns the deck, but the page scrolls at the same time, so passing the
   * section spins it instead of getting stuck in it.
   */
  captureWheel = true,
  /** Stage height. Shorter when it shares a row with something else. */
  height = "min(84vh, 780px)",
}: {
  className?: string;
  captureWheel?: boolean;
  height?: string;
}) {
  const router = useRouter();

  const stageRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const peelRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [base, setBase] = useState(-HALF);
  const [hovered, setHovered] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reduced, setReduced] = useState(false);

  /* ---- Animation state in refs: the loop must never re-render. ---- */
  const baseRef = useRef(-HALF);
  const hoveredRef = useRef<number | null>(null);
  const reducedRef = useRef(false);
  const progress = useRef(0);
  const target = useRef(0);
  const velocity = useRef(0);
  const motion = useRef(0);
  const manual = useRef(false);
  const autoStart = useRef<number | null>(null);
  const lastWheel = useRef(0);
  const dragFrom = useRef<{ y: number; progress: number } | null>(null);
  const dragMoved = useRef(false);
  const dims = useRef({ cardW: 0, cardH: 0, r: 0, cx: 0, cy: 0 });

  // Mirrored into refs so the frame loop can read them without being torn
  // down and restarted every time a pointer crosses a card.
  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  /* ---------------- measurement ---------------- */
  const measure = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const cardW = w * CARD_W_RATIO;
    const cardH = cardW / CARD_ASPECT;
    const r = cardW * RADIUS_FACTOR;
    dims.current = { cardW, cardH, r, cx: w / 2 - r, cy: h / 2 };
  }, []);

  useEffect(() => {
    measure();
    const el = stageRef.current;
    const ro = new ResizeObserver(measure);
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /* ---------------- the frame loop ---------------- */
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();

    const paint = () => {
      const { cardW, cardH, r, cx, cy } = dims.current;
      if (!cardW) return;

      const p = progress.current;
      const nextBase = Math.round(p) - HALF;

      for (let k = 0; k < POOL; k++) {
        const el = cardRefs.current[k];
        if (!el) continue;

        const d = nextBase + k - p;
        const th = d * STEP;
        const x = cx + r * Math.cos(th) - cardW / 2;
        const y = cy + r * Math.sin(th) - cardH / 2;

        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${th}rad)`;
        // Lower cards sit above the ones before them, like a dealt stack.
        el.style.zIndex = String(
          hoveredRef.current === k ? 999 : 100 + Math.round(d * 10)
        );

        const peel = peelRefs.current[k];
        if (peel) {
          // Secondary motion: strongest at the ends of the arc, quiet at the
          // centre, mirrored either side of it.
          const norm = clamp(th / (HALF * STEP), -1, 1);
          const edge = norm * norm;
          const m = motion.current;
          const side = norm < 0 ? -1 : 1;
          peel.style.transform =
            `translate3d(${12 * edge * m * side}px, ${-16 * edge * Math.abs(m)}px, 0)` +
            ` rotate(${-2.4 * edge * m * side}deg)` +
            ` scale(${1 + 0.022 * edge * Math.abs(m)})`;
        }
      }

      if (nextBase !== baseRef.current) {
        baseRef.current = nextBase;
        setBase(nextBase);
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(now - prev, 48);
      prev = now;
      const before = progress.current;

      if (!manual.current && !reducedRef.current) {
        if (autoStart.current === null) autoStart.current = now;
        const t = (now - autoStart.current) % T_LOOP;
        const k =
          t < T_DOWN
            ? easeInOutCubic(t / T_DOWN)
            : t < T_DOWN + T_HOLD
              ? 1
              : 1 - easeInOutCubic((t - T_DOWN - T_HOLD) / T_UP);
        progress.current = -1 + k;
      } else if (!dragFrom.current) {
        const d = target.current - progress.current;
        velocity.current += d * 0.115;
        velocity.current *= 0.8;
        progress.current += velocity.current;
        if (Math.abs(d) < 0.0006 && Math.abs(velocity.current) < 0.0006) {
          progress.current = target.current;
          velocity.current = 0;
        }
      }

      // Smoothed speed: quick to react, slow to release, so cards settle back
      // onto the track instead of snapping flat the moment motion stops.
      const speed = (progress.current - before) / (dt / 16.67);
      const m = clamp(speed * 2.6, -1, 1);
      motion.current +=
        (m - motion.current) *
        (Math.abs(m) > Math.abs(motion.current) ? 0.34 : 0.055);

      paint();
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const goManual = () => {
    if (!manual.current) {
      manual.current = true;
      target.current = Math.round(progress.current);
    }
  };

  /* ---- Wheel, as a native non-passive listener. React's synthetic wheel is
         registered passive, so preventDefault there is ignored. ---- */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (captureWheel) e.preventDefault();
      const now = performance.now();
      if (now - lastWheel.current < WHEEL_COOLDOWN) return;
      lastWheel.current = now;
      goManual();
      target.current += e.deltaY > 0 ? 1 : -1;
    };
    // Non-passive only when the deck actually intends to swallow the event;
    // React's synthetic wheel is passive, so preventDefault there is ignored.
    el.addEventListener("wheel", onWheel, { passive: !captureWheel });
    return () => el.removeEventListener("wheel", onWheel);
  }, [captureWheel]);

  /* ---------------- drag ---------------- */
  const onPointerDown = (e: React.PointerEvent) => {
    goManual();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragFrom.current = { y: e.clientY, progress: progress.current };
    dragMoved.current = false;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const from = dragFrom.current;
    if (!from) return;
    const dy = e.clientY - from.y;
    if (Math.abs(dy) > 4) dragMoved.current = true;
    // Pixels become slots through the arc itself, so the feel is identical at
    // every size without a separate sensitivity constant.
    progress.current = from.progress - dy / (dims.current.r * STEP);
    velocity.current = 0;
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragFrom.current) return;
    dragFrom.current = null;
    setDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    target.current = Math.round(progress.current);
  };

  const activate = (slot: number, slug: string) => {
    if (dragMoved.current) return; // a drag must not read as a click
    goManual();
    if (Math.abs(slot - progress.current) < 0.08) {
      router.push(`/projects/category/${slug}`);
      return;
    }
    target.current = slot;
  };

  return (
    <section className={className} aria-roledescription="carousel" aria-label="Browse by craft">
      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={`relative mx-auto touch-none select-none overflow-hidden ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          // Tall, phone-shaped even on a wide screen, so roughly five cards
          // stay in view at any size.
          height,
          // 100% of whatever holds it, not 92vw. Sized off the viewport it
          // overflowed the moment it was put in a column.
          width: "min(100%, 58vh)",
          overscrollBehavior: captureWheel ? "contain" : "auto",
        }}
      >
        {Array.from({ length: POOL }).map((_, k) => {
          const slot = base + k;
          const craft = CRAFTS[mod(slot, N)];
          const isInk = craft.tone === "ink";
          const isBrand = craft.tone === "brand";

          return (
            <div
              key={k}
              ref={(el) => {
                cardRefs.current[k] = el;
              }}
              className="absolute left-0 top-0 will-change-transform [backface-visibility:hidden]"
              style={{
                width: `${CARD_W_RATIO * 100}%`,
                aspectRatio: `${CARD_ASPECT}`,
                // Card-relative type sizing needs a container to measure.
                containerType: "inline-size",
              }}
              onMouseEnter={() => setHovered(k)}
              onMouseLeave={() => setHovered((h) => (h === k ? null : h))}
            >
              <div
                ref={(el) => {
                  peelRefs.current[k] = el;
                }}
                className="h-full w-full will-change-transform"
              >
                <button
                  type="button"
                  onClick={() => activate(slot, craft.slug)}
                  aria-label={`${craft.name}. Bring to centre, then open.`}
                  className={`group block h-full w-full overflow-hidden rounded-[1.35cqw] text-left shadow-[0_18px_40px_-24px_rgba(23,20,16,0.55)] ring-1 transition-[transform,box-shadow] duration-[360ms] ease-[cubic-bezier(0.22,0.61,0.24,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand motion-safe:hover:scale-[1.055] motion-safe:hover:shadow-[0_40px_80px_-30px_rgba(23,20,16,0.72)] ${
                    isInk
                      ? "bg-ink text-paper ring-white/10"
                      : isBrand
                        ? "bg-brand text-white ring-black/10"
                        : "bg-paper text-foreground ring-black/10"
                  }`}
                >
                  <div className="flex h-full">
                    <div className="relative h-full w-[40%] shrink-0 overflow-hidden">
                      <Image
                        src={craft.img}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 40vw, 22vw"
                        className="object-cover"
                        priority={k === HALF}
                      />
                      <div
                        className={`absolute inset-0 ${
                          isInk
                            ? "bg-gradient-to-r from-transparent to-ink"
                            : isBrand
                              ? "bg-gradient-to-r from-transparent to-brand"
                              : "bg-gradient-to-r from-transparent to-paper"
                        }`}
                      />
                    </div>

                    {/* Everything lives in the upper two thirds. Cards overlap
                        from below by roughly a quarter of their height, so a
                        title sitting at the bottom is a title the next card
                        eats. */}
                    <div className="flex min-w-0 flex-1 flex-col gap-[3cqw] p-[5cqw] pb-[14cqw]">
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={`font-mono text-[2.1cqw] uppercase tracking-[0.18em] ${
                            isInk ? "text-paper/55" : isBrand ? "text-white/75" : "text-muted-foreground"
                          }`}
                        >
                          {craft.label}
                        </span>
                        <span
                          className={`font-mono text-[2.1cqw] tabular-nums ${
                            isInk ? "text-paper/35" : isBrand ? "text-white/55" : "text-foreground/35"
                          }`}
                        >
                          {String(mod(slot, N) + 1).padStart(2, "0")}
                        </span>
                      </div>

                      <div>
                        <p className="font-poster text-[6.2cqw] font-bold leading-[0.95] tracking-tight">
                          {craft.name}
                        </p>
                        <p
                          className={`mt-[2cqw] text-[2.8cqw] leading-snug ${
                            isInk ? "text-paper/60" : isBrand ? "text-white/80" : "text-muted-foreground"
                          }`}
                        >
                          {craft.line}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          );
        })}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/[0.09] to-transparent"
        />
      </div>

      <p
        aria-hidden
        className="pointer-events-none mt-5 text-center font-mono text-[10px] uppercase tracking-[0.34em] text-foreground/30"
      >
        Drag — Scroll
      </p>
    </section>
  );
}
