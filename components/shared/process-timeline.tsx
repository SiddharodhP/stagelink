/**
 * Pinned-note process timeline.
 *
 * Steps as note cards tacked in a row to a ruled board, all hanging off one
 * dashed line whose dashes travel along it.
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
 * the dashed line.
 *
 * The notes follow the theme. They were pale paper in both, on the argument
 * that a pinned note is paper -- but five cream rectangles are the brightest
 * thing on a near-black page by a wide margin, and they read as cut-outs
 * pasted over the site rather than as part of it. Dark tints of the same
 * three accents keep each step's colour doing its job at a fraction of the
 * glare.
 *
 * Dark values are the base and light ones sit behind the `light:` variant,
 * because dark is this site's default -- see app/globals.css.
 *
 * HORIZONTAL, AND WHY THE FIXED STAGE WENT
 *
 * The notes used to zigzag down a 1000x1130 coordinate space, scaled as a
 * whole to fit its column, so that a hand-drawn curve could meet each card
 * exactly. In a row that space would have to be 1400 wide and would scale
 * down to about 0.75 in a real container -- which shrinks the 14px note text
 * to 10px, because scaling a stage scales its type too.
 *
 * So the row is an ordinary flex row that reflows, and the connector is one
 * straight dashed line at pin height rather than a curve between each pair.
 * With five notes across, the gaps are about 24px wide; a curve drawn through
 * one of those is not a curve anybody can see. A single line the notes are
 * pegged to is legible at any width and needs no coordinate space at all.
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
    panel: "bg-[#2a1610] light:bg-[#fbe9e0]",
    border: "border-[#6b3420] light:border-[#e8c4b3]",
    ink: "text-[#f0703c] light:text-[#c23d0d]",
  },
  amber: {
    panel: "bg-[#2a2011] light:bg-[#fbf0dd]",
    border: "border-[#67512a] light:border-[#e6cfa6]",
    ink: "text-[#e0a13f] light:text-[#96500a]",
  },
  green: {
    panel: "bg-[#13261c] light:bg-[#e6f0e9]",
    border: "border-[#33614a] light:border-[#bcd6c5]",
    ink: "text-[#56b27e] light:text-[#1d6b41]",
  },
};

const ORDER: AccentName[] = ["brand", "amber", "green"];

/**
 * Tilts, in degrees. Not strictly alternating: five identical mirror images in
 * a row reads as a pattern rather than as notes somebody pinned up.
 */
const TILT = [-3, 2.5, -2, 3, -2.5];

/**
 * Distance from the top of a card to the middle of its pin -- half of the
 * 32px pin, now that nothing sits above it. The dashed line runs at this
 * height, so the pins land on it.
 */
const PIN_CENTRE = 16;

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
      <PushPin className={`mx-auto mb-5 ${a.ink}`} />
      <div
        className={`flex flex-1 flex-col rounded-[15px] border p-[15px] shadow-[0_18px_36px_-16px_var(--card-shadow)] ${a.panel} ${a.border}`}
      >
        <p
          className={`font-poster text-[32px] font-bold leading-none tabular-nums ${a.ink}`}
        >
          {String(index + 1).padStart(2, "0")}
        </p>
        <h3 className="mt-4 text-balance text-[19px] font-semibold leading-tight tracking-tight text-foreground">
          {step.title}
        </h3>
        <p className="mt-2 text-[13.5px] leading-[19px] tracking-[-0.01em] text-muted-foreground">
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

  // Each note used to sit on a rounded `bg-card` mount. On a light page that
  // read as white board-backing behind a coloured note. On a dark one the
  // mount is the same colour as the section it sits in, so five of them in a
  // row merged into a single black bar with the notes stuck to it, and the
  // pin floated in dead space above each one. The note is pinned straight to
  // the board now -- which is what a pinned note is -- and carries its own
  // shadow.
  const mount = "flex h-full flex-col";

  return (
    <section className={className}>
      <div className="relative overflow-hidden py-2">
        {/* Ruled board */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,var(--board-rule)_0px,var(--board-rule)_1px,transparent_1px,transparent_32px)]"
        />
        {/* Edges fade so the ruling does not run into the page. They fade to
            `card` because that is the section's own ground -- fading to
            `background` laid a subtly wrong colour down both sides. No
            z-index: they must stay under the notes, which a row pushes right
            up to both edges. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-card to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-card to-transparent"
        />

        <div className="relative">
          {/* The line the notes hang from. Behind them, so it shows only in
              the gaps and appears to run through each card at pin height. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 hidden h-px motion-safe:animate-[dash-slide_1.6s_linear_infinite] lg:block"
            style={{
              top: PIN_CENTRE,
              backgroundImage:
                "repeating-linear-gradient(to right, var(--board-route) 0 8px, transparent 8px 14px)",
            }}
          />

          {/* ---------- Mobile and tablet: a plain column ---------- */}
          <ol className="relative flex flex-col gap-8 lg:hidden">
            {list.map((step, i) => (
              <li key={step.title}>
                <div className={mount}>
                  <Card
                    step={step}
                    index={i}
                    accent={step.accent ?? ORDER[i % ORDER.length]}
                  />
                </div>
              </li>
            ))}
          </ol>

          {/* ---------- Desktop: pinned across the board ----------
               items-stretch, so five notes with one, two and three line
               titles still end level with each other. */}
          <ol className="relative hidden items-stretch gap-6 lg:flex">
            {list.map((step, i) => (
              <li key={step.title} className="min-w-0 flex-1">
                <article
                  className={`${mount} origin-center transition-transform duration-300 ease-out hover:z-20 motion-safe:hover:scale-[1.05]`}
                  style={{ rotate: `${TILT[i % TILT.length]}deg` }}
                >
                  <Card
                    step={step}
                    index={i}
                    accent={step.accent ?? ORDER[i % ORDER.length]}
                  />
                </article>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
