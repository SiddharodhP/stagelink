"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pinned-note process timeline.
 *
 * Steps as note cards tacked to a ruled board, staggered left and right, joined
 * by one curved dashed route whose dashes travel along it.
 *
 * ADAPTATIONS FROM THE BRIEF
 *
 * Accents: the brief proposed coral, sky blue and mint. Blue and mint would be
 * the first cool colours anywhere on this site, so the three themes are drawn
 * from tokens the project already defines -- brand persimmon, warning amber,
 * success green -- which keeps the section inside the warm palette the
 * photography is graded to.
 *
 * Step numbers are set in the poster face rather than a handwritten one. A
 * third typeface for a decorative numeral is a lot to carry for one component;
 * the pinned-note character comes from the pin, the tilt, the pale panels and
 * the dashed route.
 *
 * No dark mode. This project sets color-scheme: light and defines no dark
 * theme, so dark: variants here would be code nobody could see or test.
 */

export type TimelineStep = {
  title: string;
  description: string;
  /** Accent theme; cycles through the three if omitted. */
  accent?: AccentName;
};

type AccentName = "brand" | "amber" | "green";

const ACCENTS: Record<
  AccentName,
  { panel: string; border: string; ink: string }
> = {
  brand: {
    panel: "bg-[#fbe9e0]",
    border: "border-[#e8c4b3]",
    ink: "text-[#c23d0d]",
  },
  amber: {
    panel: "bg-[#fbf0dd]",
    border: "border-[#e6cfa6]",
    ink: "text-[#96500a]",
  },
  green: {
    panel: "bg-[#e6f0e9]",
    border: "border-[#bcd6c5]",
    ink: "text-[#1d6b41]",
  },
};

const ORDER: AccentName[] = ["brand", "amber", "green"];

/** The coordinate space the board and its curve are drawn in. */
const STAGE_WIDTH = 1000;

/** Desktop stage height grows with the number of steps. */
const STAGE_HEIGHT: Record<number, number> = {
  1: 400,
  2: 450,
  3: 800,
  4: 900,
  5: 1130,
};

/**
 * Desktop placement, in the 1000x1130 coordinate space the connector is drawn
 * in. Left cards lean clockwise, right cards lean back, both by 8 degrees.
 */
const SLOTS = [
  { side: "left" as const, x: 70, y: 20, rotate: 8 },
  { side: "right" as const, x: 650, y: 280, rotate: -8 },
  { side: "left" as const, x: 130, y: 540, rotate: 8 },
  { side: "right" as const, x: 640, y: 790, rotate: -8 },
  { side: "left" as const, x: 90, y: 1040, rotate: 8 },
];

/**
 * One continuous route, cut to the number of steps in play. Each entry is the
 * curve reaching the next card, so n steps use the first n-1 of them.
 */
const LEGS = [
  "M 348 232 C 470 292 548 296 652 372",
  "C 612 482 502 548 412 638",
  "C 520 700 580 730 640 838",
  "C 540 930 400 960 300 1046",
];

function PushPin({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={32}
      height={32}
      aria-hidden
      focusable="false"
      className={className}
      fill="currentColor"
    >
      <path d="M14.8 2.2a1 1 0 0 0-1.6.3l-.9 2A5.6 5.6 0 0 0 7 7.7l-2.2.6a1 1 0 0 0-.45 1.66l3.2 3.2-4.06 5.42a.6.6 0 0 0 .86.86L9.77 15.4l3.2 3.2a1 1 0 0 0 1.66-.45l.6-2.2a5.6 5.6 0 0 0 3.2-5.3l2-.9a1 1 0 0 0 .3-1.6Z" />
    </svg>
  );
}

function Card({
  step,
  index,
  accent,
}: {
  step: TimelineStep;
  index: number;
  accent: AccentName;
}) {
  const a = ACCENTS[accent];
  return (
    <>
      <PushPin className={`mx-auto mb-6 ${a.ink}`} />
      <div className={`rounded-[15px] border p-[15px] ${a.panel} ${a.border}`}>
        <p
          className={`font-poster text-[36px] font-bold leading-none tabular-nums ${a.ink}`}
        >
          {String(index + 1).padStart(2, "0")}
        </p>
        <h3 className="mt-5 text-[24px] font-semibold leading-tight tracking-tight text-foreground">
          {step.title}
        </h3>
        <p className="mt-2 text-[14px] leading-[20px] tracking-[-0.01em] text-muted-foreground">
          {step.description}
        </p>
      </div>
    </>
  );
}

export function ProcessTimeline({
  steps,
  className,
}: {
  steps: TimelineStep[];
  className?: string;
}) {
  const list = steps.slice(0, 5);
  const height = STAGE_HEIGHT[list.length] ?? 800;
  const path = LEGS.slice(0, Math.max(0, list.length - 1)).join(" ");

  /**
   * The desktop board is laid out in a fixed 1000px coordinate space, which is
   * what lets the cards and the curve share one set of numbers. To live in a
   * column narrower than that it scales as a whole rather than reflowing, so
   * the curve still meets the cards exactly.
   */
  const fitRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  const fit = useCallback(() => {
    const el = fitRef.current;
    if (!el) return;
    setScale(Math.min(1, el.clientWidth / STAGE_WIDTH));
  }, []);

  useEffect(() => {
    fit();
    const el = fitRef.current;
    if (!el) return;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  const shell =
    "rounded-[25px] border border-border bg-white p-[8px] shadow-[0_10px_24px_-12px_rgba(23,20,16,0.28)]";

  return (
    <section className={className}>
      <div className="relative overflow-hidden">
        {/* Ruled board */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(26,23,19,0.055)_0px,rgba(26,23,19,0.055)_1px,transparent_1px,transparent_32px)]"
        />
        {/* Edges fade so the ruling does not run into the page */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-white to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-white to-transparent"
        />

        <div className="relative">
          {/* ---------- Mobile: a plain column ---------- */}
          <ol className="flex flex-col gap-8 lg:hidden">
            {list.map((step, i) => (
              <li key={step.title} className={shell}>
                <Card
                  step={step}
                  index={i}
                  accent={step.accent ?? ORDER[i % ORDER.length]}
                />
              </li>
            ))}
          </ol>

          {/* ---------- Desktop: pinned to the board ---------- */}
          <div
            ref={fitRef}
            className="relative mx-auto hidden overflow-hidden lg:block"
            style={{ height: height * scale }}
          >
            <div
              className="absolute left-1/2 top-0 origin-top"
              style={{
                width: STAGE_WIDTH,
                height,
                transform: `translateX(-50%) scale(${scale})`,
              }}
            >
            <svg
              aria-hidden
              focusable="false"
              viewBox={`0 0 1000 ${height}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              {path && (
                <path
                  d={path}
                  fill="none"
                  stroke="rgba(26,23,19,0.22)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray="8 6"
                  /* 14 = dash + gap, so one cycle lands exactly on the next
                     dash and the loop has no visible seam. */
                  className="motion-safe:[animation:dash-travel_3s_linear_infinite]"
                />
              )}
            </svg>

            <ol className="contents">
              {list.map((step, i) => {
                const slot = SLOTS[i];
                return (
                  <li
                    key={step.title}
                    className="absolute w-[280px]"
                    style={{ left: slot.x, top: slot.y }}
                  >
                    <article
                      className={`${shell} origin-center transition-transform duration-300 ease-out hover:z-20 motion-safe:hover:scale-[1.05]`}
                      style={{ rotate: `${slot.rotate}deg` }}
                    >
                      <Card
                        step={step}
                        index={i}
                        accent={step.accent ?? ORDER[i % ORDER.length]}
                      />
                    </article>
                  </li>
                );
              })}
            </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
