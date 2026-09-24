"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * A short list of claims beside one vertically sliding image track.
 *
 * All the images live in a single tall strip and the strip itself moves, which
 * is the whole point: stepping from the first row to the third carries the
 * second image through the frame on the way, because it is physically between
 * them. Cross-fading three separate images would lose that and read as a
 * slideshow rather than a track.
 *
 * ADAPTATIONS FROM THE BRIEF
 *
 * Four rows a side rather than the five that were here, and the copy is this
 * project's own. The brief's Pexels URLs are not used: remote images would be
 * the only ones on a site that serves everything from its own /public, and
 * would bypass next/image entirely.
 *
 * The brief wanted the second row active on load. Kept -- it puts the track
 * mid-travel rather than parked at an end, so the first movement in either
 * direction shows what the component does.
 */

export type ServiceItem = {
  title: string;
  img: string;
  /** Empty when the picture only decorates the claim beside it. */
  alt: string;
};

export function ServiceSlider({
  eyebrow,
  heading,
  items,
  tone = "light",
  accent,
  className,
}: {
  eyebrow: string;
  heading: string;
  items: ServiceItem[];
  /** Which ground it sits on; drives the text and rule colours. */
  tone?: "light" | "dark";
  /**
   * The side's colour, as a CSS colour. The panel behind carries it as a
   * wash; this is the same colour at full strength, for the two marks that
   * have to hold it -- the eyebrow and the active row's rule.
   */
  accent?: string;
  className?: string;
}) {
  // Second row on load, so the track starts mid-travel.
  const [active, setActive] = useState(Math.min(1, items.length - 1));
  const dark = tone === "dark";
  const step = 100 / items.length;

  return (
    <div className={className}>
      <p
        className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
          accent ? "" : dark ? "text-paper/45" : "text-foreground/45"
        }`}
        style={accent ? { color: accent } : undefined}
      >
        {eyebrow}
      </p>
      <h3
        className={`font-poster mt-3 text-[clamp(1.35rem,2vw,1.75rem)] font-bold leading-tight tracking-tight ${
          dark ? "text-paper" : "text-foreground"
        }`}
      >
        {heading}
      </h3>

      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-stretch sm:gap-4 md:gap-5">
        {/* ---- Claims ---- */}
        <ul className="flex w-full flex-col sm:w-[46%] sm:shrink-0">
          {items.map((item, i) => {
            const on = i === active;
            return (
              <li key={item.title} className="flex-1">
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  aria-pressed={on}
                  className={`group relative flex h-full w-full items-center gap-2.5 py-2.5 pl-4 pr-1 text-left focus:outline-none sm:py-0 ${
                    i > 0 ? (dark ? "border-t border-white/10" : "border-t border-border") : ""
                  }`}
                >
                  {/* Grows from a short centred tick to the full row. */}
                  <span
                    aria-hidden
                    className={`absolute left-0 top-1/2 w-px -translate-y-1/2 transition-[height] duration-500 ease-out motion-reduce:transition-none ${
                      accent ? "" : dark ? "bg-paper" : "bg-foreground"
                    } ${on ? "h-full" : "h-3 opacity-40"}`}
                    style={accent ? { backgroundColor: accent } : undefined}
                  />
                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      dark ? "text-paper/40" : "text-foreground/35"
                    }`}
                  >
                    ({String(i + 1).padStart(2, "0")})
                  </span>
                  <span
                    className={`text-[13px] leading-tight transition-colors duration-200 ${
                      on
                        ? dark
                          ? "font-semibold text-paper"
                          : "font-semibold text-foreground"
                        : dark
                          ? "font-normal text-paper/50"
                          : "font-normal text-muted-foreground"
                    }`}
                  >
                    {item.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* ---- One moving strip, not three swapped pictures ---- */}
        <div
          className="relative w-full overflow-hidden rounded-[12px] sm:w-[54%]"
          style={{ aspectRatio: "1.18" }}
        >
          <div
            className="absolute inset-x-0 top-0 transition-transform duration-[720ms] ease-[cubic-bezier(0.76,0,0.24,1)] motion-reduce:transition-none"
            style={{
              height: `${items.length * 100}%`,
              // Percentages here are of the track, not the frame, so a step is
              // one image's share of it rather than a whole frame height.
              transform: `translate3d(0, -${active * step}%, 0)`,
            }}
          >
            {items.map((item) => (
              <div
                key={item.img}
                className="relative w-full"
                style={{ height: `${step}%` }}
              >
                <Image
                  src={item.img}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 1024px) 60vw, 30vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
