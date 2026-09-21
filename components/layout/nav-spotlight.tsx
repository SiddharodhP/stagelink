"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

/**
 * The primary nav as a lit pill: one overhead cone and one bar marking wherever
 * you currently are.
 *
 * ADAPTATIONS FROM THE BRIEF
 *
 * Labels, not icons -- asked for, and right for four destinations whose names
 * carry meaning that a house or a bookmark would not.
 *
 * Four items, so the travel step is 25% rather than the 20% the brief assumed
 * for five. It is derived from the list length, not typed in, so adding a fifth
 * link needs no arithmetic here.
 *
 * The brief drives the highlight from clicks. This is a real navbar, so it is
 * driven from the route instead: a click is only one of the ways you arrive
 * somewhere, and back, forward and a pasted URL would all leave a click-driven
 * light pointing at the wrong thing. Clicks still move it immediately so the
 * response is instant, and the route corrects it when navigation lands.
 *
 * Tailwind rather than a stylesheet inside the component: the brief said no
 * Tailwind, but everything else here is Tailwind, and one file styled a
 * different way is a file nobody maintains. Geometry that has to be computed --
 * the cone width and its travel -- is inline style, where it belongs.
 */

const SPRING = { type: "spring" as const, stiffness: 160, damping: 22, mass: 0.95 };

export function NavSpotlight({
  links,
  onDark,
}: {
  links: readonly { label: string; href: string }[];
  /** True while the bar sits over the homepage's ink hero. */
  onDark: boolean;
}) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLDivElement | null>(null);

  const [hash, setHash] = useState("");
  // The click is remembered together with the route it was made from. No
  // effect resets it: once the route differs from the one it was made on, the
  // navigation has landed and the route index simply wins.
  const [clicked, setClicked] = useState<{ i: number; from: string } | null>(null);

  // Section links such as /#how-it-works share a pathname with the homepage,
  // so the hash is the only thing that tells them apart.
  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const here = pathname + hash;

  const routeIndex = useMemo(() => {
    // Longest match first, so /#how-it-works beats a bare / if both were listed.
    let best = -1;
    let bestLen = 0;
    links.forEach((l, i) => {
      if (l.href.includes("#")) {
        if (here === l.href && l.href.length > bestLen) {
          best = i;
          bestLen = l.href.length;
        }
      } else if (pathname === l.href && l.href.length > bestLen) {
        best = i;
        bestLen = l.href.length;
      }
    });
    return best;
  }, [pathname, here, links]);

  // The click leads until the route catches up with it.
  const active = clicked && clicked.from === here ? clicked.i : routeIndex;

  const n = links.length;
  const step = 100 / n;
  const lit = active >= 0;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const items = listRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-nav]");
    if (!items?.length) return;
    const from = Array.from(items).findIndex((el) => el === document.activeElement);
    const next =
      e.key === "ArrowRight"
        ? (from + 1 + items.length) % items.length
        : (from - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <div
      ref={listRef}
      onKeyDown={onKeyDown}
      className={`relative hidden items-stretch overflow-hidden rounded-[22px] md:flex ${
        onDark
          ? "bg-white/[0.06] ring-1 ring-inset ring-white/15"
          : "bg-ink ring-1 ring-inset ring-white/10"
      } shadow-[0_18px_40px_-24px_rgba(0,0,0,0.65)]`}
      style={{ width: "min(34rem, 46vw)", height: 56 }}
    >
      {/* ---- The one cone. Narrow at the bar, wide at the floor. ---- */}
      {lit && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0"
          style={{ width: `${step}%` }}
          initial={false}
          animate={{ x: `${active * 100}%` }}
          transition={reduced ? { duration: 0 } : SPRING}
        >
          <div
            className="absolute inset-0"
            style={{
              clipPath: "polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%)",
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.07) 55%, rgba(255,255,255,0) 100%)",
            }}
          />
          {/* The same cone's spill where it lands, not a second light. */}
          <div
            className="absolute inset-x-0 bottom-0 h-3 blur-md"
            style={{
              background:
                "linear-gradient(to top, rgba(255,255,255,0.22), rgba(255,255,255,0))",
            }}
          />
          {/* The source */}
          <div className="absolute left-1/2 top-0 h-[7px] w-[66px] max-w-[70%] -translate-x-1/2 rounded-full bg-white shadow-[0_0_14px_2px_rgba(255,255,255,0.45)]" />
        </motion.div>
      )}

      {/* ---- Destinations ---- */}
      {links.map((link, i) => {
        const on = i === active;
        return (
          <Link
            key={link.href}
            href={link.href}
            data-nav
            aria-current={on ? "page" : undefined}
            onClick={() => setClicked({ i, from: here })}
            className="relative z-10 flex flex-1 items-center justify-center px-2 text-center focus:outline-none"
            style={{ width: `${step}%` }}
          >
            <motion.span
              className={`text-[13px] font-medium leading-none transition-colors duration-200 ${
                on ? "text-[#f2f2f2]" : "text-[#8b8781] hover:text-[#d7d3cc]"
              }`}
              animate={on ? { y: -1, scale: 1.04 } : { y: 0, scale: 1 }}
              whileTap={reduced ? undefined : { scale: 0.94 }}
              transition={reduced ? { duration: 0 } : SPRING}
            >
              {link.label}
            </motion.span>
            {/* Focus ring drawn inside, so it is not clipped by the pill. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-1 rounded-[16px] ring-0 ring-white/60 transition-[box-shadow] [a:focus-visible>&]:ring-2"
            />
          </Link>
        );
      })}
    </div>
  );
}
