"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

/**
 * The six real categories, with the photograph that stands for each.
 *
 * Display names are shortened from the database names -- "Photo Editing &
 * Retouching" wraps to three lines in a tile -- but the slugs are the real
 * ones, so each tile lands on its own category page.
 */
const CRAFTS = [
  { name: "Photography", slug: "photography", img: "/marketing/cat-photography.webp" },
  { name: "Videography", slug: "videography", img: "/marketing/cat-videography.webp" },
  { name: "Video editing", slug: "video-editing", img: "/marketing/cat-video-editing.webp" },
  { name: "Photo editing", slug: "photo-editing", img: "/marketing/cat-photo-editing.webp" },
  { name: "Motion graphics", slug: "motion-graphics", img: "/marketing/cat-motion-graphics.webp" },
  { name: "Drone & aerial", slug: "drone-aerial", img: "/marketing/cat-drone-aerial.webp" },
];

/**
 * The six crafts as a contact sheet: numbered frames, square corners, and the
 * one you point at marked in select orange.
 *
 * Lifted off the homepage and kept whole so it can be dropped somewhere else
 * in one line. It renders nowhere at the moment -- that is deliberate, not an
 * oversight.
 *
 * Nothing is marked at rest. Marking a frame nobody chose would be inventing
 * data; the ring follows the pointer instead, which is motion answering an
 * action rather than motion for its own sake.
 */
export function CraftGrid({
  eyebrow = "Built for people who shoot",
  heading = "What Jayree does",
  className,
}: {
  eyebrow?: string;
  heading?: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="font-poster mt-4 text-[clamp(1.9rem,3.6vw,2.75rem)] font-bold leading-tight">
            {heading}
          </h2>
        </div>

        <motion.div
          className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 md:gap-x-5"
          initial="rest"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          {CRAFTS.map((c, i) => (
            <motion.div
              key={c.slug}
              variants={{ rest: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Link href={`/projects/category/${c.slug}`} className="group block">
                {/* The rebate: frame number left, select mark right. */}
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="font-mono text-[11px] tabular-nums text-foreground/35">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    Select
                  </span>
                </div>
                <div className="relative aspect-[4/5] overflow-hidden bg-ink/5 outline outline-1 -outline-offset-1 outline-ink/10 transition-all duration-300 group-hover:outline-2 group-hover:outline-brand">
                  <Image
                    src={c.img}
                    alt={c.name}
                    fill
                    sizes="(max-width: 768px) 45vw, 30vw"
                    className="object-cover"
                  />
                </div>
                <p className="mt-2 text-[13px] leading-snug">{c.name}</p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
