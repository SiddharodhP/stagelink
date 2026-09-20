"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { CraftDeck } from "@/components/shared/craft-deck";
import { ProcessTimeline } from "@/components/shared/process-timeline";
import {
  ArrowRight,
  ListChecks,
  Check,
  Camera,
  Briefcase,
  Wallet,
  FileText,
  RefreshCw,
  Star,
  Video,
  MapPin,
  Lock,
  Layers,
} from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { searchProjects } from "@/lib/services/projects";
import { Project } from "@/types/marketplace";
import { formatPrice } from "@/lib/utils";

/**
 * Entrance animation is deliberately inert everywhere except the contact
 * sheet, which carries its own variants inline.
 *
 * Every section used to fade and slide up as it scrolled into view. Scattered
 * entrances make a page feel like it is performing rather than presenting,
 * and they are one of the clearest tells of a generated layout. There is one
 * orchestrated moment now -- the sheet dealing its frames on load -- and
 * everything below it is simply there when you arrive.
 */
const fadeUp = {};
const stagger = {};
const staggerItem = {};

const FREELANCER_BENEFITS = [
  {
    icon: Wallet,
    title: "Paid per stage",
  },
  {
    icon: ListChecks,
    title: "You agree the plan",
  },
  {
    icon: FileText,
    title: "Invoice in one click",
  },
  {
    icon: RefreshCw,
    title: "Recurring retainers",
  },
  {
    icon: Star,
    title: "A reputation you own",
  },
];

const CLIENT_BENEFITS = [
  {
    icon: Layers,
    title: "See the plan before you pay",
  },
  {
    icon: Lock,
    title: "Money moves on approval",
  },
  {
    icon: MapPin,
    title: "Browse by city and craft",
  },
  {
    icon: Video,
    title: "Talk before you commit",
  },
  {
    icon: FileText,
    title: "One paper trail",
  },
];

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    searchProjects({ sortBy: "newest", page: 1 }).then(({ data }) => {
      setProjects(data.slice(0, 6));
    });
  }, []);

  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* ============ Hero ============
             Structure borrowed from ballance.framer.website: a centred stack on
             a dark-to-light gradient, a mono pill above the headline, a two
             button row with one hot CTA, and the subject bleeding up out of the
             gradient. The palette is ours, not theirs -- deep ink resolving to
             paper rather than navy resolving to white -- because seventeen
             photographs are graded to this ground and would be orphaned by a
             blue one. */}
        <section
          data-dark-hero
          className="relative isolate overflow-hidden"
        >
          {/* Ink at the top so the headline reads in paper, resolving to the
              page ground at the bottom so the section joins what follows
              instead of ending at a hard line. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-20 bg-[linear-gradient(to_bottom,#171410_0%,#171410_30%,#241f19_46%,#584e42_68%,#cfc6b8_86%,#f7f4ee_100%)]"
          />

          <div className="container relative mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-3xl pt-32 text-center md:pt-36">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 rounded-md bg-paper/10 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/80 ring-1 ring-inset ring-paper/15 transition-colors hover:bg-paper/15 hover:text-paper"
                >
                  <span className="h-2 w-2 bg-brand" />
                  See what is open right now
                </Link>

                <h1 className="font-poster mt-7 text-[clamp(2.5rem,6.4vw,4.75rem)] font-bold leading-[0.98] text-paper">
                  Get paid without chasing
                </h1>

                <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.6] text-paper/70">
                  Roster splits every shoot into stages. The client funds each one
                  before it starts, you deliver, and the money is released when it
                  is approved. No invoicing into silence.
                </p>

                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    asChild
                    className="h-12 rounded-md bg-paper/10 px-7 font-mono text-[12px] uppercase tracking-[0.12em] text-paper ring-1 ring-inset ring-paper/20 hover:bg-paper/20"
                  >
                    <Link href="/projects">Browse the work</Link>
                  </Button>
                  <Button
                    asChild
                    className="h-12 rounded-md bg-brand px-7 font-mono text-[12px] uppercase tracking-[0.12em] text-white hover:bg-brand-deep"
                  >
                    <Link href="/login">Create a profile</Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* The subject, in normal flow rather than pinned to the bottom.

              It used to be absolutely positioned inside a 124vh section, which
              meant the gap between the buttons and the top of his head was a
              function of window height -- fine on a tall screen, and his hair
              ran into the buttons on a short one. In flow it simply follows the
              copy and cannot collide with it at any size.

              The margin is negative because the measurement that matters is not
              the element's top -- the photograph's upper sixth is empty dark
              ground before his hair starts, so a 64px gap to the element read as
              nearly 180px of nothing on screen. Pulling the frame up by 48px
              lands the visible hairline about 70px under the buttons. It is a
              fixed offset, so unlike the old absolute positioning it cannot
              drift with the window; mobile takes a smaller one because the
              frame is smaller there and so is its empty margin.

              Masked rather than cropped. The photograph's own ground is a warm
              vignette, not a flat colour, so a plain rectangle would show its
              edges against the page gradient. Two masks intersect: one fades
              the sides, one carries the bottom into paper. The top is left
              alone -- the image is already dark there and meets the page's ink
              directly, and fading it only ever produced a visible box. */}
          <div aria-hidden className="pointer-events-none relative -z-10 -mt-4 flex justify-center md:-mt-12">
            <div
              className="relative aspect-[5/6] w-[min(34rem,86vw)]"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, #000 20%, #000 80%, transparent 100%), linear-gradient(to bottom, #000 0%, #000 66%, transparent 97%)",
                WebkitMaskComposite: "source-in",
                maskImage:
                  "linear-gradient(to right, transparent 0%, #000 20%, #000 80%, transparent 100%), linear-gradient(to bottom, #000 0%, #000 66%, transparent 97%)",
                maskComposite: "intersect",
              }}
            >
              <Image
                src="/marketing/hero-figure.webp"
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 86vw, 34rem"
                className="object-cover object-top"
              />
            </div>
            </div>
        </section>

        {/* ============ Three facts ============
             Ballance runs 82% / 10x / 54% here. Those are measurements, and
             Roster has not measured anything yet -- inventing them would be
             putting fabricated evidence on the front page of a product about
             trust. These are three things that are true by construction, set at
             the same weight, and they become real numbers the day there is
             data worth printing. */}
        <section className="border-b border-border pb-20 pt-4 md:pb-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 text-center sm:grid-cols-3 sm:gap-8">
              {[
                { big: "Every stage", small: "is funded into escrow before the work on it starts" },
                { big: "Both ways", small: "reviews, so reputation is earned by clients too" },
                { big: "No one", small: "sits between you and the person doing the work" },
              ].map((f) => (
                <div key={f.big}>
                  <p className="font-poster text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-none">
                    {f.big}
                  </p>
                  <p className="mx-auto mt-3 max-w-[26ch] text-[15px] leading-relaxed text-muted-foreground">
                    {f.small}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============ Benefits, both sides ============ */}
        <section
          id="for-freelancers"
          className="relative overflow-hidden py-20 md:py-28"
        >
          {/* Washes in the two panel colours, so the split is felt before
              it is read. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-56 -top-40 h-[36rem] w-[36rem] rounded-full bg-[#0C2F2A]/[0.08] blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-56 top-24 h-[36rem] w-[36rem] rounded-full bg-brand/[0.10] blur-3xl"
          />

          <div className="container relative mx-auto px-4 md:px-6">
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
              {/* ---- Freelancers: deep teal, amber accents ---- */}
              <motion.div
                {...stagger}
                className="group/panel relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#0C2F2A] via-[#0A2622] to-[#061A17] p-8 text-[#F4EFE6] shadow-[0_40px_80px_-50px_rgba(6,26,23,0.95)] md:p-10"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F0A868]/20 blur-3xl"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#F0A868]/50 to-transparent"
                />

                <div className="relative">
                  <div className="mb-8 flex items-center gap-3.5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0A868]/15 text-[#F0A868] ring-1 ring-inset ring-[#F0A868]/25">
                      <Camera className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F0A868]">
                        For freelancers
                      </p>
                      <p className="font-poster text-2xl font-bold">
                        Shoot. Deliver. Get paid.
                      </p>
                    </div>
                  </div>

                  {/* Filled rows, not hairlines between them.

                      A 1px rule was the obvious answer and it kept failing on
                      this panel: identical markup and identical border colour
                      to the client side, verified in the shipped CSS and in
                      the served HTML, and still nothing readable against the
                      near black ground. A row that is its own block does not
                      depend on a single pixel surviving a gradient, a blurred
                      glow behind it, and whatever the display does to it. */}
                  <ul className="space-y-2">
                    {FREELANCER_BENEFITS.map(({ icon: Icon, title }) => (
                      <motion.li
                        key={title}
                        variants={staggerItem}
                        className="group/row flex items-center gap-4 rounded-xl bg-white/[0.09] px-4 py-3.5 ring-1 ring-inset ring-white/[0.18] transition-colors duration-300 hover:bg-white/[0.16]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-[#F0A868] ring-1 ring-inset ring-white/10 transition-all duration-300 group-hover/row:bg-[#F0A868] group-hover/row:text-[#0A2622] group-hover/row:ring-[#F0A868]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <p className="text-[17px] font-semibold leading-snug">{title}</p>
                      </motion.li>
                    ))}
                  </ul>

                  <motion.div variants={staggerItem} className="mt-8">
                    <Button
                      asChild
                      size="lg"
                      className="w-full rounded-full bg-[#F0A868] px-8 text-base font-semibold text-[#0A2622] hover:bg-[#F5BC88] sm:w-auto"
                    >
                      <Link href="/login">
                        Start as a freelancer
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              {/* ---- Clients: persimmon, the complement of that teal ---- */}
              <motion.div
                {...stagger}
                className="group/panel relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#D6440F] via-[#C03A0B] to-[#8F2A06] p-8 text-[#FDF3EC] shadow-[0_40px_80px_-50px_rgba(143,42,6,0.85)] md:p-10"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-[#FFD9A0]/25 blur-3xl"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
                />

                <div className="relative">
                  <div className="mb-8 flex items-center gap-3.5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
                      <Briefcase className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFD9A0]">
                        For clients
                      </p>
                      <p className="font-poster text-2xl font-bold">
                        Book with confidence.
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {CLIENT_BENEFITS.map(({ icon: Icon, title }) => (
                      <motion.li
                        key={title}
                        variants={staggerItem}
                        className="group/row flex items-center gap-4 rounded-xl bg-white/[0.12] px-4 py-3.5 ring-1 ring-inset ring-white/25 transition-colors duration-300 hover:bg-white/[0.20]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-inset ring-white/20 transition-all duration-300 group-hover/row:bg-white group-hover/row:text-[#C03A0B]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <p className="text-[17px] font-semibold leading-snug">{title}</p>
                      </motion.li>
                    ))}
                  </ul>

                  <motion.div variants={staggerItem} className="mt-8">
                    <Button
                      asChild
                      size="lg"
                      className="w-full rounded-full bg-[#FDF3EC] px-8 text-base font-semibold text-[#8F2A06] hover:bg-white sm:w-auto"
                    >
                      <Link href="/login">
                        Hire a creator
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </div>

            <motion.div
              {...fadeUp}
              className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-muted-foreground"
            >
              {[
                "Escrow on every stage",
                "No agency middlemen",
                "Reviews both ways",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand" />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ============ Live projects ============ */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              {...fadeUp}
              className="mb-10 flex flex-wrap items-end justify-between gap-4"
            >
              <div>
                {/* The open-project counter is gone. It was honest and it was
                    live, but with five test briefs it advertised an empty
                    marketplace. It comes back when the number sells the page
                    rather than undercutting it. */}
                <h2 className="font-poster text-[clamp(1.9rem,3.2vw,2.5rem)] font-bold leading-tight">
                  Shoots looking for someone
                </h2>
              </div>
              <Link
                href="/projects"
                className="link-editorial hidden items-center gap-1 text-sm font-medium sm:flex"
              >
                Browse all projects
              </Link>
            </motion.div>

            {projects.length > 0 ? (
              <motion.div
                {...stagger}
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {projects.map((p) => (
                  <motion.div key={p.id} variants={staggerItem}>
                    {/* Opens the public project page: the brief, who is
                        already bidding, and a sign-in-to-bid button. Jumping
                        straight to login asked people to commit before they
                        had seen anything. */}
                    <Link
                      href={`/projects/${p.id}`}
                      className="group flex h-full flex-col rounded-2xl border border-border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ink/25 hover:shadow-[0_24px_48px_-32px_rgba(23,20,16,0.5)]"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-[13px] text-muted-foreground">
                          {p.category?.name || "Project"}
                        </span>
                        <span className="font-poster text-lg font-bold tabular-nums">
                          {formatPrice(p.budget_total)}
                        </span>
                      </div>

                      <h3 className="mb-2 line-clamp-2 break-words text-xl font-semibold leading-snug transition-colors group-hover:text-brand">
                        {p.title}
                      </h3>
                      <p className="mb-4 line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">
                        {p.description}
                      </p>

                      {p.skills?.length > 0 && (
                        <div className="mb-5 flex flex-wrap gap-1.5">
                          {p.skills.slice(0, 3).map((sk) => (
                            <span
                              key={sk}
                              className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground/80"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
                        <span>
                          {p.bids_count} {p.bids_count === 1 ? "bid" : "bids"}
                          {p.milestones?.length
                            ? `, ${p.milestones.length} milestones`
                            : ""}
                        </span>
                        <span className="font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                          Sign in to view
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
                <p className="font-poster mb-2 text-2xl font-bold">
                  No open shoots right now
                </p>
                <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                  Post the first one, or list yourself as a freelancer.
                </p>
                <Button
                  asChild
                  className="rounded-full bg-ink text-paper hover:bg-ink-soft"
                >
                  <Link href="/login">Get started</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ============ How it works ============
             Two halves of the same answer, side by side: what people hire for
             on the left, how the money moves on the right. They were separate
             full-width sections, which made the page repeat itself -- you
             scrolled past a heading, then another heading, to learn two things
             that belong together. */}
        <section id="how-it-works" className="border-t border-border bg-white py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-12">
              {/* ---- What people hire for ---- */}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/45">
                  Built for people who shoot
                </p>
                <h2 className="font-poster mt-3 text-[clamp(1.55rem,2.4vw,2rem)] font-bold leading-tight">
                  What Roster does
                </h2>
                <div className="mt-7 rounded-2xl bg-[#e9e4db] px-4 py-6">
                  <CraftDeck captureWheel={false} height="min(58vh, 520px)" />
                </div>
              </div>

              {/* ---- How the money moves ---- */}
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/45">
                  How it works
                </p>
                <h2 className="font-poster mt-3 text-[clamp(1.55rem,2.4vw,2rem)] font-bold leading-tight">
                  Post. Pick. Pay in stages.
                </h2>
                <ProcessTimeline
                  className="mt-7"
                  steps={[
                    {
                      title: "Post the work",
                      description:
                        "Write a brief and set a budget. That is all it takes to go live.",
                    },
                    {
                      title: "Pick your person",
                      description:
                        "Compare bids on price, approach and track record.",
                    },
                    {
                      title: "Pay stage by stage",
                      description:
                        "Agree the split, fund each stage, release it on approval.",
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ============ Final CTA ============ */}
        <section className="pb-20 md:pb-28">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              {...fadeUp}
              className="rounded-2xl border border-ink/15 bg-brand-soft px-8 py-16 text-center md:py-20"
            >
              <h2 className="font-poster mx-auto mb-6 max-w-2xl text-[clamp(1.9rem,3.4vw,2.75rem)] font-bold leading-tight">
                Post a project, or find your next one
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
                Free to join. Pay only when work is approved.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-14 rounded-full bg-ink px-10 text-base text-paper hover:bg-ink-soft"
                >
                  <Link href="/login">
                    Get started <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-ink/20 px-10 text-base"
                >
                  <Link href="/projects">Browse projects</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
