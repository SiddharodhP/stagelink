"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";

/**
 * A draggable 3D carousel: the cards sit on the outside of an invisible
 * cylinder and the whole cylinder turns.
 *
 * ADAPTATIONS FROM THE BRIEF
 *
 * The brief's indigo-and-blue ground is its own stated fallback, "when no
 * design system exists". This one does, so the glows are persimmon and amber
 * over warm black. It is dark in both themes, like the footer and the hero:
 * an ink band, not a themed surface.
 *
 * No `html, body { background: #09090b }` reset. That would repaint the whole
 * site from one section and break the light theme outright. The band paints
 * its own ground instead, which is what the reset was for.
 *
 * Full width rather than `100vw`. On a page with a scrollbar, 100vw is wider
 * than the content box by the scrollbar's width, which is exactly the
 * horizontal overflow the brief asks to avoid. The section is a direct child
 * of <main>, so plain `w-full` already reaches both edges.
 *
 * Twelve slots for six photographs. The brief asks for eight to ten cards; six
 * would sit 60 degrees apart, which leaves you looking into the gap between
 * two steeply turned cards as often as at a card. Each photograph appears
 * twice, 180 degrees apart -- never both in view at once, so the repeat cannot
 * be seen from anywhere on the cylinder.
 *
 * The group is pushed back by one radius so the front card lands at z = 0.
 * Without that, a card at +460px under a 760px perspective is magnified two
 * and a half times and fills the screen.
 */

export type CarouselImage = {
  src: string;
  alt: string;
  caption?: string;
};

/** Degrees of rotation per pixel dragged. */
const DRAG_DEG_PER_PX = 0.16;
/** How far a flick is allowed to carry, in degrees. */
const MAX_PROJECTION = 150;
/** Movement past this is a drag, not a click on a card. */
const DRAG_SLOP = 6;

const SPRING = { type: "spring" as const, stiffness: 72, damping: 19, mass: 0.8 };
const OPEN_SPRING = { type: "spring" as const, stiffness: 210, damping: 28, mass: 0.8 };

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function cardSizeFor(w: number) {
  if (w < 400) return 132;
  if (w < 640) return 158;
  if (w < 768) return 186;
  if (w < 1024) return 206;
  return 240;
}

export function CraftCarousel({
  images,
  eyebrow,
  heading,
  description,
  className,
}: {
  images: CarouselImage[];
  eyebrow: string;
  heading: string;
  description: string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement | null>(null);

  const rotation = useMotionValue(0);
  const momentum = useRef<{ stop: () => void } | null>(null);
  const drag = useRef<{
    id: number;
    startX: number;
    startRot: number;
    lastX: number;
    lastT: number;
    velocity: number;
    moved: number;
  } | null>(null);
  /** Set while a pointer gesture travelled far enough to be a drag. */
  const suppressClick = useRef(false);

  // Deliberately NOT setPointerCapture. Capturing retargets the click that
  // follows pointerup to the capturing element, so the card's own onClick
  // never ran and nothing could be opened. Window listeners track the pointer
  // just as well, outside the element included, and leave the click alone.
  const release = useRef<(() => void) | null>(null);

  const [width, setWidth] = useState(0);
  const [open, setOpen] = useState<{ index: number; from: DOMRect } | null>(null);

  // Every photograph twice, so twelve slots sit 30 degrees apart. A list that
  // is already long enough is used as it stands.
  const slots = useMemo(() => {
    if (!images.length) return [];
    const repeat = images.length >= 8 ? 1 : Math.ceil(9 / images.length);
    return Array.from({ length: images.length * repeat }, (_, i) => ({
      image: images[i % images.length],
      index: i % images.length,
    }));
  }, [images]);

  const step = slots.length ? 360 / slots.length : 0;
  const card = cardSizeFor(width || 1024);
  const gap = Math.round(card * 0.16);
  const radius = slots.length
    ? (card + gap) / 2 / Math.tan(Math.PI / slots.length)
    : 0;
  const perspective = Math.min(760, Math.max(520, (width || 1024) * 1.15));

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  useEffect(
    () => () => {
      momentum.current?.stop();
      release.current?.();
    },
    [],
  );

  const groupTransform = useTransform(
    rotation,
    (r) => `translateZ(${-radius}px) rotateY(${r}deg)`,
  );

  const spin = useCallback(
    (deltaDeg: number) => {
      momentum.current?.stop();
      const to = rotation.get() + deltaDeg;
      momentum.current = reduced
        ? (rotation.set(to), null)
        : animate(rotation, to, SPRING);
    },
    [reduced, rotation],
  );

  /* ---- Dragging. Rotation is a motion value, so none of this re-renders. ---- */

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    momentum.current?.stop();
    release.current?.();

    const d = {
      id: e.pointerId,
      startX: e.clientX,
      startRot: rotation.get(),
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
      moved: 0,
    };
    drag.current = d;
    suppressClick.current = false;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== d.id) return;
      const dx = ev.clientX - d.startX;
      d.moved = Math.max(d.moved, Math.abs(dx));
      if (d.moved > DRAG_SLOP) suppressClick.current = true;
      rotation.set(d.startRot + dx * DRAG_DEG_PER_PX);

      const t = performance.now();
      const dt = t - d.lastT;
      if (dt > 0) d.velocity = (ev.clientX - d.lastX) / dt; // px per ms
      d.lastX = ev.clientX;
      d.lastT = t;
    };

    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== d.id) return;
      release.current?.();
      drag.current = null;
      if (reduced) return;
      // Stale velocity from a pointer that came to rest before lifting would
      // fling the cylinder for a gesture that had already stopped.
      const idle = performance.now() - d.lastT > 90;
      const carry = idle
        ? 0
        : clamp(d.velocity * 1000 * DRAG_DEG_PER_PX * 0.22, -MAX_PROJECTION, MAX_PROJECTION);
      if (Math.abs(carry) < 0.5) return;
      momentum.current = animate(rotation, rotation.get() + carry, SPRING);
    };

    release.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      release.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      spin(-step);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      spin(step);
    }
  };

  const openCard = (index: number, el: HTMLElement) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    setOpen({ index, from: el.getBoundingClientRect() });
  };

  return (
    <div
      className={`relative isolate h-[100svh] min-h-[560px] w-full overflow-hidden ${className ?? ""}`}
      style={{
        background:
          "radial-gradient(circle at 50% 16%, rgba(214,68,17,0.22), transparent 36%)," +
          "radial-gradient(circle at 12% 86%, rgba(180,83,9,0.14), transparent 34%)," +
          "linear-gradient(180deg, #1c1813 0%, #12100d 56%, #070605 100%)",
      }}
    >
      {/* ---- Header. Not in the way of the drag. ---- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-6 px-5 pt-[calc(env(safe-area-inset-top,0px)+6rem)] sm:px-8 md:px-12 md:pt-[calc(env(safe-area-inset-top,0px)+7.5rem)]">
        <div className="max-w-xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper/45">
            {eyebrow}
          </p>
          <h2 className="font-poster mt-3 text-[clamp(1.5rem,4vw,3rem)] font-bold leading-[1.05] tracking-tight text-paper">
            {heading}
          </h2>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-paper/55">
            {description}
          </p>
        </div>
        <span className="hidden shrink-0 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/50 ring-1 ring-inset ring-paper/15 sm:inline-block">
          {String(images.length).padStart(2, "0")} crafts
        </span>
      </div>

      {/* ---- Stage ---- */}
      <div
        ref={stageRef}
        role="group"
        aria-label={heading}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        className="absolute inset-0 z-10 cursor-grab select-none active:cursor-grabbing focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-paper/30"
        style={{ perspective: `${perspective}px`, touchAction: "pan-y" }}
      >
        <motion.div
          className="absolute left-1/2 top-[58%] h-0 w-0"
          style={{
            transformStyle: "preserve-3d",
            transform: groupTransform,
            willChange: "transform",
          }}
        >
          {slots.map((slot, i) => (
            <div
              key={`${slot.image.src}-${i}`}
              className="absolute left-0 top-0"
              style={{
                width: card,
                height: card,
                transform: `translate(-50%, -50%) rotateY(${i * step}deg) translateZ(${radius}px)`,
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
              }}
            >
              <button
                type="button"
                onClick={(e) => openCard(slot.index, e.currentTarget)}
                aria-label={`Expand: ${slot.image.alt}`}
                className="group relative block h-full w-full overflow-hidden rounded-[18px] border border-white/12 bg-[#1a1613] shadow-[0_28px_60px_-24px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-out hover:-translate-y-[5px] hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100"
              >
                <Image
                  src={slot.image.src}
                  alt={slot.image.alt}
                  fill
                  draggable={false}
                  sizes="(max-width: 640px) 40vw, 240px"
                  loading={i < 4 ? "eager" : "lazy"}
                  className="pointer-events-none object-cover"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/75 to-transparent"
                />
                {slot.image.caption && (
                  <span className="pointer-events-none absolute bottom-3 left-3 right-3 text-left font-mono text-[10px] uppercase tracking-[0.12em] text-white/85">
                    {slot.image.caption}
                  </span>
                )}
              </button>
            </div>
          ))}
        </motion.div>

        {/* Cards fade into the ground as they turn away, rather than being
            cut off at the section edge. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-[14%] bg-gradient-to-r from-[#0c0a08] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[14%] bg-gradient-to-l from-[#0c0a08] to-transparent"
        />
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-[calc(env(safe-area-inset-bottom,0px)+1.75rem)] text-center font-mono text-[10px] uppercase tracking-[0.2em] text-paper/30">
        Drag — or use the arrow keys
      </p>

      <AnimatePresence>
        {open && (
          <Expanded
            image={images[open.index]}
            from={open.from}
            reduced={!!reduced}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Expanded({
  image,
  from,
  reduced,
  onClose,
}: {
  image: CarouselImage;
  from: DOMRect;
  reduced: boolean;
  onClose: () => void;
}) {
  const figureRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  // The card sits inside a preserve-3d ancestor, where Framer's layout
  // animations mis-measure. Measuring the two rects and animating the delta
  // gives the same shared-element expansion without involving layout.
  useLayoutEffect(() => {
    const el = figureRef.current;
    if (!el) return;
    const to = el.getBoundingClientRect();
    if (!to.width || !to.height) return;
    x.set(from.left + from.width / 2 - (to.left + to.width / 2));
    y.set(from.top + from.height / 2 - (to.top + to.height / 2));
    scale.set(clamp(from.width / to.width, 0.05, 1));
    if (reduced) {
      x.set(0);
      y.set(0);
      scale.set(1);
      return;
    }
    const a = animate(x, 0, OPEN_SPRING);
    const b = animate(y, 0, OPEN_SPRING);
    const c = animate(scale, 1, OPEN_SPRING);
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [from, reduced, scale, x, y]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.classList.add("modal-open");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
      previous?.focus?.();
    };
  }, [onClose]);

  // Portalled to <body>. The band sets `isolate`, so an overlay rendered
  // inside it is stacked within that context and the fixed navbar -- a
  // sibling of the band, not of the overlay -- paints straight over it, close
  // button and all. No z-index inside the band can beat that.
  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={image.caption || image.alt}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/88 p-5 backdrop-blur-md sm:p-10"
    >
      <motion.figure
        ref={figureRef}
        onClick={(e) => e.stopPropagation()}
        style={{ x, y, scale }}
        className="relative m-0 flex max-h-[90svh] w-auto max-w-[min(92vw,1100px)] flex-col"
      >
        <img
          src={image.src}
          alt={image.alt}
          draggable={false}
          className="max-h-[82svh] w-auto rounded-xl object-contain shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]"
        />
        {image.caption && (
          <figcaption className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-white/65">
            {image.caption}
          </figcaption>
        )}
      </motion.figure>

      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:right-8 sm:top-8"
      >
        <X className="h-5 w-5" />
      </button>
    </motion.div>,
    document.body,
  );
}
