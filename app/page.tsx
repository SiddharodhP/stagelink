"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  ShieldCheck,
  ListChecks,
  Gavel,
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

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

/** Parent/child pair so panel rows arrive one after another, not all at once. */
const stagger = {
  initial: {},
  whileInView: {},
  viewport: { once: true, margin: "-60px" },
  transition: { staggerChildren: 0.07, delayChildren: 0.1 },
};

const staggerItem = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

const FREELANCER_BENEFITS = [
  {
    icon: Wallet,
    title: "Paid per milestone, funded upfront",
    text: "Each stage is escrowed before you shoot. You never work on a promise.",
  },
  {
    icon: ListChecks,
    title: "You confirm the plan first",
    text: "The milestone structure needs your explicit agreement — it isn't imposed on you.",
  },
  {
    icon: FileText,
    title: "Invoice in one click",
    text: "Send an invoice with the PDF attached the moment a stage is delivered.",
  },
  {
    icon: RefreshCw,
    title: "Retainers, not just one-offs",
    text: "Bill an ongoing client weekly or monthly, issued and chased automatically.",
  },
  {
    icon: Star,
    title: "A reputation you own",
    text: "Every completed contract adds a public review from real, paid work.",
  },
];

const CLIENT_BENEFITS = [
  {
    icon: Layers,
    title: "See the whole plan before you pay",
    text: "Every deliverable, deadline and price is agreed before a shutter clicks.",
  },
  {
    icon: Lock,
    title: "Money moves only on approval",
    text: "Funds sit in escrow until you sign off. Nothing is released on trust.",
  },
  {
    icon: MapPin,
    title: "Browse by city and craft",
    text: "Filter photographers, videographers and editors who can actually reach your shoot.",
  },
  {
    icon: Video,
    title: "Talk before you commit",
    text: "Video call anyone from the message thread — no scheduling links, no third-party app.",
  },
  {
    icon: FileText,
    title: "One clean paper trail",
    text: "Invoices, receipts and payments in one place, with tax fields built in.",
  },
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    searchProjects({ sortBy: "newest", page: 1 }).then(({ data, count }) => {
      setProjects(data.slice(0, 6));
      setOpenCount(count);
    });
  }, []);

  const goSearch = (q: string) => {
    router.push(q ? `/projects?q=${encodeURIComponent(q)}` : "/projects");
  };

  return (
    <>
      <Navbar />

      <main className="flex-1">
        {/* ============ Hero ============ */}
        <section className="relative overflow-hidden pb-16 pt-36 md:pb-24 md:pt-44">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid items-start gap-14 lg:grid-cols-[1.1fr_0.9fr]">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <p className="eyebrow mb-5">
                  For photographers, videographers &amp; editors
                </p>
                <h1 className="font-display mb-6 text-5xl font-semibold leading-[1.04] tracking-tight md:text-[4.25rem]">
                  Book the shoot.
                  <br />
                  Paid in{" "}
                  <span className="italic text-brand">stages.</span>
                </h1>
                <p className="mb-8 max-w-xl text-lg leading-relaxed text-muted-foreground">
                  Hire photographers, videographers and editors for real work.
                  Shoots are split into milestones with clear deliverables and
                  prices, and every stage is funded in escrow before it starts.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    goSearch(query);
                  }}
                  className="mb-4 flex max-w-xl items-center gap-2 rounded-full border border-ink/20 bg-white p-2 pl-5 shadow-[0_10px_30px_-18px_rgba(26,23,19,0.35)] focus-within:border-ink/50"
                >
                  <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Try “wedding photographer”, “product video”, “colour grading”…"
                    className="w-full bg-transparent text-[15px] outline-none"
                  />
                  <Button
                    type="submit"
                    className="h-11 shrink-0 rounded-full bg-ink px-6 text-paper hover:bg-ink-soft"
                  >
                    Find work
                  </Button>
                </form>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-brand" /> Escrow on every milestone
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-brand" /> No agency middlemen
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-brand" /> Two-way reviews
                  </span>
                </div>
              </motion.div>

              {/* Milestone illustration — the product's actual mechanic */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
                className="hidden lg:block"
                aria-hidden
              >
                <div className="rounded-2xl border border-border bg-white p-6 shadow-[0_24px_60px_-30px_rgba(26,23,19,0.3)]">
                  <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
                    <div>
                      <p className="eyebrow mb-1">Sample project</p>
                      <p className="font-display text-lg font-semibold">
                        Two-day brand campaign shoot
                      </p>
                    </div>
                    <span className="font-display text-xl font-semibold">
                      {formatPrice(65000)}
                    </span>
                  </div>

                  <ol className="space-y-0">
                    {[
                      { n: 1, t: "Pre-production & shot list", a: 10000, s: "paid" },
                      { n: 2, t: "Two-day studio shoot", a: 25000, s: "paid" },
                      { n: 3, t: "Selects & retouching", a: 20000, s: "active" },
                      { n: 4, t: "Final delivery & usage rights", a: 10000, s: "pending" },
                    ].map((m, i, arr) => (
                      <li key={m.n} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                              m.s === "paid"
                                ? "border-ink bg-ink text-paper"
                                : m.s === "active"
                                  ? "border-brand bg-brand-soft text-brand-deep"
                                  : "border-border bg-white text-muted-foreground"
                            }`}
                          >
                            {m.s === "paid" ? <Check className="h-3.5 w-3.5" /> : m.n}
                          </span>
                          {i < arr.length - 1 && <span className="w-px flex-1 bg-border" />}
                        </div>
                        <div className="flex-1 pb-5">
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm font-medium">{m.t}</p>
                            <span className="font-display text-sm font-semibold">
                              {formatPrice(m.a)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {m.s === "paid"
                              ? "Approved · payment released"
                              : m.s === "active"
                                ? "In progress · funded in escrow"
                                : "Awaiting funding"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ============ Benefits, both sides ============ */}
        {/* id kept from the old section so the footer's "Why Roster" link
            still lands somewhere sensible — arguably more sensible now,
            since this covers both sides rather than only freelancers. */}
        <section
          id="for-freelancers"
          className="relative overflow-hidden border-y border-border bg-white py-20 md:py-28"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-brand/[0.07] blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-ink/[0.06] blur-3xl"
          />

          <div className="container relative mx-auto px-4 md:px-6">
            <motion.div {...fadeUp} className="mx-auto mb-14 max-w-2xl text-center">
              <p className="eyebrow mb-3">Why Roster</p>
              <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                One platform,{" "}
                <span className="italic text-brand">two sides</span>
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Shoots run on agreed milestones and escrowed payments, so
                neither side is working on trust alone.
              </p>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              {/* Freelancers — dark panel */}
              <motion.div
                {...stagger}
                className="group/panel relative overflow-hidden rounded-3xl bg-ink p-8 text-paper shadow-[0_30px_60px_-40px_rgba(23,20,16,0.9)] md:p-10"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/20 blur-3xl transition-opacity duration-700 group-hover/panel:opacity-150"
                />
                <div className="relative">
                  <div className="mb-8 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-paper/10 ring-1 ring-inset ring-paper/20">
                      <Camera className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/50">
                        For freelancers
                      </p>
                      <p className="font-display text-2xl font-semibold">
                        Shoot. Deliver. Get paid.
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-1">
                    {FREELANCER_BENEFITS.map(({ icon: Icon, title, text }) => (
                      <motion.li
                        key={title}
                        variants={staggerItem}
                        className="group/row flex gap-4 rounded-2xl p-3 transition-colors hover:bg-paper/[0.06]"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper/10 text-paper/70 transition-colors group-hover/row:bg-brand group-hover/row:text-white">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold leading-snug">{title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-paper/60">
                            {text}
                          </p>
                        </div>
                      </motion.li>
                    ))}
                  </ul>

                  <motion.div variants={staggerItem} className="mt-8">
                    <Button
                      asChild
                      size="lg"
                      className="w-full rounded-full bg-paper px-8 text-base text-ink hover:bg-white sm:w-auto"
                    >
                      <Link href="/login">
                        Start as a freelancer
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              {/* Clients — light panel */}
              <motion.div
                {...stagger}
                className="group/panel relative overflow-hidden rounded-3xl border border-border bg-paper p-8 shadow-[0_30px_60px_-45px_rgba(23,20,16,0.45)] md:p-10"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-brand/10 blur-3xl"
                />
                <div className="relative">
                  <div className="mb-8 flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-paper">
                      <Briefcase className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="eyebrow">For clients</p>
                      <p className="font-display text-2xl font-semibold">
                        Book with confidence.
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-1">
                    {CLIENT_BENEFITS.map(({ icon: Icon, title, text }) => (
                      <motion.li
                        key={title}
                        variants={staggerItem}
                        className="group/row flex gap-4 rounded-2xl p-3 transition-colors hover:bg-white"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-muted-foreground ring-1 ring-inset ring-border transition-colors group-hover/row:bg-ink group-hover/row:text-paper group-hover/row:ring-ink">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="font-semibold leading-snug">{title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {text}
                          </p>
                        </div>
                      </motion.li>
                    ))}
                  </ul>

                  <motion.div variants={staggerItem} className="mt-8">
                    <Button
                      asChild
                      size="lg"
                      className="w-full rounded-full bg-ink px-8 text-base text-paper hover:bg-ink-soft sm:w-auto"
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
                <p className="eyebrow mb-3">
                  {openCount > 0
                    ? `${openCount} open right now`
                    : "Live on the marketplace"}
                </p>
                <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                  Shoots looking for someone
                </h2>
              </div>
              <Link
                href="/projects"
                className="link-editorial hidden items-center gap-1 text-sm font-medium sm:flex"
              >
                Browse all projects <ArrowUpRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {projects.length > 0 ? (
              <motion.div
                {...stagger}
                className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
              >
                {projects.map((p) => (
                  <motion.div key={p.id} variants={staggerItem}>
                    {/* Sends visitors to sign in, carrying the project so they
                        land on it afterwards rather than a generic dashboard. */}
                    <Link
                      href={`/login?next=${encodeURIComponent(`/projects/${p.id}`)}`}
                      className="group flex h-full flex-col rounded-2xl border border-border bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ink/25 hover:shadow-[0_24px_48px_-32px_rgba(23,20,16,0.5)]"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="eyebrow">
                          {p.category?.name || "Project"}
                        </span>
                        <span className="font-display text-lg font-semibold">
                          {formatPrice(p.budget_total)}
                        </span>
                      </div>

                      <h3 className="font-display mb-2 line-clamp-2 text-xl font-semibold leading-snug transition-colors group-hover:text-brand">
                        {p.title}
                      </h3>
                      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
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
                            ? ` · ${p.milestones.length} milestones`
                            : ""}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                          Sign in to view <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-white px-6 py-16 text-center">
                <p className="font-display mb-2 text-2xl font-semibold">
                  No open shoots right now
                </p>
                <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                  Post the first one, or create a freelancer profile so
                  you&apos;re listed when clients start looking.
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

        {/* ============ How it works ============ */}
        <section id="how-it-works" className="border-t border-border bg-white py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div {...fadeUp} className="mb-14 max-w-2xl">
              <p className="eyebrow mb-3">How it works</p>
              <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                Structure first. Then competition. Then payment.
              </h2>
            </motion.div>

            <motion.div
              {...fadeUp}
              className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3"
            >
              {[
                {
                  n: "01",
                  icon: ListChecks,
                  title: "The client defines the work",
                  text: "A project is split into milestones — each with its own deliverables, deadline, and payment amount. No vague briefs, no scope surprises.",
                },
                {
                  n: "02",
                  icon: Gavel,
                  title: "Freelancers bid on it",
                  text: "They see the full milestone structure before bidding, then compete on price, approach, and track record. Clients pick the best fit — not just the cheapest.",
                },
                {
                  n: "03",
                  icon: ShieldCheck,
                  title: "Payment follows approval",
                  text: "The client funds a milestone into escrow before work starts, and releases it once the deliverable is approved. Nobody works months for nothing.",
                },
              ].map((step) => (
                <div key={step.n} className="bg-background p-8 md:p-10">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="font-display text-5xl font-light text-foreground/15">
                      {step.n}
                    </span>
                    <step.icon className="h-6 w-6 text-brand" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold tracking-tight">{step.title}</h3>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ============ Final CTA ============ */}
        <section className="pb-20 md:pb-28">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              {...fadeUp}
              className="rounded-2xl border border-ink/15 bg-brand-soft px-8 py-16 text-center md:py-20"
            >
              <h2 className="font-display mx-auto mb-6 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
                Post a project, or find your next one
              </h2>
              <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
                Free to join. You only pay when work is delivered and approved.
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
