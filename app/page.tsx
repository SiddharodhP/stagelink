"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { CraftCarousel } from "@/components/shared/craft-carousel";
import { ServiceSlider } from "@/components/shared/service-slider";
import { ProcessTimeline } from "@/components/shared/process-timeline";
import {
  ArrowRight,
  Check,
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
            className="absolute inset-0 -z-20 bg-[image:var(--hero-gradient)]"
          />

          <div className="container relative mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-4xl pt-32 text-center md:pt-36">
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
                  Work without the wait
                </Link>

                {/* The second sentence is a block from md up, which is what puts
                    the break after "Get it done." rather than wherever the line
                    happens to run out. Inline below that, so a narrow screen
                    wraps it on its own terms. */}
                <h1 className="font-poster mt-7 text-balance text-[clamp(2.25rem,5.2vw,4rem)] font-bold leading-[1.02] text-paper">
                  Find work. Get it done.{" "}
                  <span className="md:block">Get paid faster.</span>
                </h1>

                <p className="mx-auto mt-6 max-w-xl text-[17px] leading-[1.6] text-paper/70">
                  Jayree splits every shoot into stages. The client funds each one
                  before it starts, you deliver, and the money is released when it
                  is approved. No invoicing into silence.
                </p>

                <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    asChild
                    className="h-12 rounded-md bg-brand px-7 font-mono text-[12px] uppercase tracking-[0.12em] text-white hover:bg-brand-deep"
                  >
                    <Link href="/projects">Find work</Link>
                  </Button>
                  <Button
                    asChild
                    className="h-12 rounded-md bg-paper/10 px-7 font-mono text-[12px] uppercase tracking-[0.12em] text-paper ring-1 ring-inset ring-paper/20 hover:bg-paper/20"
                  >
                    <Link href="/projects/new">Post a job</Link>
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
             Jayree has not measured anything yet -- inventing them would be
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

        {/* ============ Both sides ============
             Two claims lists, each beside one sliding image track. Four a side:
             the list shares its height with the picture, so the rows have to
             stay tall enough to read -- five was too many, three left the
             column short beside a 1.18 frame.

             Orange for freelancers, blue for clients. Both were solid slabs
             of their colour, which put two of the loudest surfaces on the
             site side by side and left the photographs inside fighting the
             panel. They are dark cards now, each lit from its top corner by
             its own colour -- the colour still says whose side you are on,
             but the pictures and the type are what you look at.

             Blue is the first cool colour on a deliberately warm site, so it
             is kept deep: it has to read as the other half of a pair with the
             persimmon, not as a different website. */}
        <section className="relative overflow-hidden border-b border-border bg-background py-20 md:py-24">
          <div className="container relative mx-auto px-4 md:px-6">
            <div className="mx-auto mb-14 max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/70 ring-1 ring-inset ring-border">
                <span className="h-2 w-2 bg-brand" aria-hidden />
                Built for both sides
              </span>
              <h2 className="font-poster mt-6 text-balance text-[clamp(1.9rem,3.4vw,2.75rem)] font-bold leading-tight tracking-tight">
                Everything you need to make work happen.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[17px] leading-[1.6] text-muted-foreground">
                Whether you are a freelancer looking for the next opportunity or
                a business that needs great work done, Jayree gives you the tools
                to make it happen.
              </p>
            </div>

            <div className="grid gap-12 lg:grid-cols-2 lg:gap-14">
              {/* ---- Freelancers ---- */}
              <div
                className="rounded-[1.75rem] p-7 shadow-[0_40px_80px_-50px_rgba(0,0,0,0.9)] ring-1 ring-inset ring-white/10 md:p-9"
                style={{
                  background:
                    "radial-gradient(120% 95% at 0% 0%, rgba(214,68,17,0.38), transparent 62%)," +
                    "linear-gradient(158deg, #1e1711 0%, #16120e 56%, #100e0c 100%)",
                }}
              >
                <ServiceSlider
                  tone="dark"
                  accent="#f2703c"
                  eyebrow="For freelancers"
                  heading="Find meaningful work and get paid without the chase."
                  items={[
                    {
                      title: "Discover relevant projects",
                      img: "/marketing/svc-browse-city-craft.webp",
                      alt: "A camera bag on a rooftop ledge above a city at dusk",
                    },
                    {
                      // STAND-IN. Swap for /marketing/svc-reusable-proposals.webp
                      // once that image exists -- prompt G1 in
                      // jayree-image-prompts.md.
                      title: "Apply with reusable proposals",
                      img: "/marketing/svc-see-the-plan.webp",
                      alt: "Printed plan sheets laid out and squared up on a table",
                    },
                    {
                      title: "Manage work in one place",
                      img: "/marketing/svc-invoice-one-click.webp",
                      alt: "A hand resting on a laptop trackpad at a desk",
                    },
                    {
                      title: "Get paid by milestone",
                      img: "/marketing/svc-paid-per-stage.webp",
                      alt: "A photographer packing a lens away at the end of a shoot",
                    },
                  ]}
                />
              </div>

              {/* ---- Clients ---- */}
              <div
                className="rounded-[1.75rem] p-7 shadow-[0_40px_80px_-50px_rgba(0,0,0,0.9)] ring-1 ring-inset ring-white/10 md:p-9"
                style={{
                  background:
                    "radial-gradient(120% 95% at 0% 0%, rgba(29,111,184,0.42), transparent 62%)," +
                    "linear-gradient(158deg, #111820 0%, #0e1319 56%, #0b0f13 100%)",
                }}
              >
                <ServiceSlider
                  tone="dark"
                  accent="#54a2ea"
                  eyebrow="For clients"
                  heading="Find the right talent and get work done with confidence."
                  items={[
                    {
                      title: "Post jobs in minutes",
                      img: "/marketing/svc-see-the-plan.webp",
                      alt: "Printed plan sheets laid out and squared up on a table",
                    },
                    {
                      title: "Review proposals and portfolios",
                      img: "/marketing/svc-money-on-approval.webp",
                      alt: "A photographic print held up to the window and examined",
                    },
                    {
                      title: "Work with confidence using milestones",
                      img: "/marketing/svc-agree-the-plan.webp",
                      alt: "Two people going through a plan together at a table",
                    },
                    {
                      // STAND-IN. Swap for /marketing/svc-everything-one-place.webp
                      // once that image exists -- prompt G2 in
                      // jayree-image-prompts.md.
                      title: "Keep everything in one place",
                      img: "/marketing/svc-invoice-one-click.webp",
                      alt: "A hand resting on a laptop trackpad at a desk",
                    },
                  ]}
                />
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-muted-foreground">
              {["Escrow on every stage", "No agency middlemen", "Reviews both ways"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand" />
                  {t}
                </span>
              ))}
            </div>
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
                      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/25 hover:shadow-[0_24px_48px_-32px_rgba(23,20,16,0.5)]"
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
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
                <p className="font-poster mb-2 text-2xl font-bold">
                  No open shoots right now
                </p>
                <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                  Post the first one, or list yourself as a freelancer.
                </p>
                <Button
                  asChild
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Link href="/login">Get started</Link>
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ============ What people hire for ============
             A full-viewport band, so the cylinder has room to turn. It sits
             directly above the process because the two answer different
             questions in order: what people are hired for, then how the job
             runs. */}
        <CraftCarousel
          className="border-t border-border"
          eyebrow="Built for people who shoot"
          heading="What Jayree does"
          description="Drag to explore. Select an image to expand."
          images={[
            {
              src: "/marketing/cat-photography.webp",
              alt: "A photographer shooting handheld in available light",
              caption: "Photography",
            },
            {
              src: "/marketing/cat-videography.webp",
              alt: "A camera operator filming with a rig on location",
              caption: "Videography",
            },
            {
              src: "/marketing/cat-video-editing.webp",
              alt: "An editor cutting footage at a colour-graded desk",
              caption: "Video editing",
            },
            {
              src: "/marketing/cat-photo-editing.webp",
              alt: "A retoucher culling and grading stills on screen",
              caption: "Photo editing",
            },
            {
              src: "/marketing/cat-motion-graphics.webp",
              alt: "A motion designer building titles and lower thirds",
              caption: "Motion graphics",
            },
            {
              src: "/marketing/cat-drone-aerial.webp",
              alt: "A drone pilot flying for an aerial shot at golden hour",
              caption: "Drone & aerial",
            },
          ]}
        />

        {/* ============ How it works ============
             Five steps in a row rather than a zigzag down the page. Both
             audiences are named in the first step, because the process is one
             process and it starts from either end. */}
        <section id="how-it-works" className="border-t border-border bg-card py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/70 ring-1 ring-inset ring-border">
                <span className="h-2 w-2 bg-brand" aria-hidden />
                How it works
              </span>
              <h2 className="font-poster mt-6 text-balance text-[clamp(1.75rem,3.2vw,2.6rem)] font-bold leading-tight tracking-tight">
                From brief to payment, all in one place.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[17px] leading-[1.6] text-muted-foreground">
                Jayree makes it easy to go from idea to completion, with a clear
                process for both freelancers and clients.
              </p>
            </div>
            <ProcessTimeline
              className="mt-14"
              steps={[
                {
                  title: "Post or find work",
                  description:
                    "Freelancers browse opportunities, or clients post a job.",
                },
                {
                  title: "Agree on milestones",
                  description:
                    "Set clear deliverables, timelines and payment stages.",
                },
                {
                  title: "Get to work",
                  description:
                    "Collaborate, share files and track progress in one place.",
                },
                {
                  title: "Review and approve",
                  description:
                    "Clients review the work and approve each milestone.",
                },
                {
                  title: "Get paid",
                  description: "Funds are released securely, on time.",
                },
              ]}
            />
          </div>
        </section>

        {/* ============ Final CTA ============ */}
        <section className="pb-20 md:pb-28">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              {...fadeUp}
              className="rounded-2xl border border-foreground/15 bg-brand-soft px-8 py-16 text-center md:py-20"
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
                  className="h-14 rounded-full bg-primary px-10 text-base text-primary-foreground hover:bg-primary/90"
                >
                  <Link href="/login">
                    Get started <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-foreground/20 px-10 text-base"
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
