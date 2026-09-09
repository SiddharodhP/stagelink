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
        {/* ============ Benefits, both sides ============ */}
        {/* First thing on the page now. The hero this replaced made the same
            argument more slowly, and behind a mockup. id kept so the footer
            link still lands here. */}
        <section
          id="for-freelancers"
          className="relative overflow-hidden pb-20 pt-32 md:pb-28 md:pt-40"
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
            <motion.div {...fadeUp} className="mx-auto mb-12 max-w-3xl text-center">
              <p className="eyebrow mb-4">
                For photographers, videographers &amp; editors
              </p>
              <h1 className="font-display text-5xl font-semibold leading-[1.03] tracking-tight md:text-[4.5rem]">
                Book the shoot.
                <br />
                Paid in <span className="italic text-brand">stages.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Split every shoot into stages. Each one is funded before it
                starts and paid on approval.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  goSearch(query);
                }}
                className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-ink/15 bg-white p-2 pl-5 shadow-[0_10px_30px_-18px_rgba(26,23,19,0.35)] focus-within:border-ink/50"
              >
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try “wedding photographer”, “product video”…"
                  className="w-full bg-transparent text-[15px] outline-none"
                />
                <Button
                  type="submit"
                  className="h-11 shrink-0 rounded-full bg-ink px-6 text-paper hover:bg-ink-soft"
                >
                  Find work
                </Button>
              </form>
            </motion.div>

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
                      <p className="font-display text-2xl font-semibold">
                        Shoot. Deliver. Get paid.
                      </p>
                    </div>
                  </div>

                  {/* Rules rather than gaps. Once the second line went the
                      rows had nothing holding them together and read as five
                      loose labels floating in the panel. */}
                  <ul className="divide-y divide-white/10">
                    {FREELANCER_BENEFITS.map(({ icon: Icon, title }) => (
                      <motion.li
                        key={title}
                        variants={staggerItem}
                        className="group/row -mx-3 flex items-center gap-4 px-3 py-3.5 transition-colors duration-300 hover:bg-white/[0.05]"
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
                      <p className="font-display text-2xl font-semibold">
                        Book with confidence.
                      </p>
                    </div>
                  </div>

                  <ul className="divide-y divide-white/20">
                    {CLIENT_BENEFITS.map(({ icon: Icon, title }) => (
                      <motion.li
                        key={title}
                        variants={staggerItem}
                        className="group/row -mx-3 flex items-center gap-4 px-3 py-3.5 transition-colors duration-300 hover:bg-white/[0.10]"
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
                    {/* Opens the public project page: the brief, who is
                        already bidding, and a sign-in-to-bid button. Jumping
                        straight to login asked people to commit before they
                        had seen anything. */}
                    <Link
                      href={`/projects/${p.id}`}
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

                      <h3 className="font-display mb-2 line-clamp-2 break-words text-xl font-semibold leading-snug transition-colors group-hover:text-brand">
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

        {/* ============ How it works ============ */}
        <section id="how-it-works" className="border-t border-border bg-white py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div {...fadeUp} className="mb-14 max-w-2xl">
              <p className="eyebrow mb-3">How it works</p>
              <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                Post. Pick. Pay in stages.
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
                  title: "Post the work",
                  text: "Write a brief, set a budget. That is all it takes to go live.",
                },
                {
                  n: "02",
                  icon: Gavel,
                  title: "Pick your person",
                  text: "Compare bids on price, approach and track record.",
                },
                {
                  n: "03",
                  icon: ShieldCheck,
                  title: "Agree stages, then pay",
                  text: "Split the work into stages. Fund each one, release it on approval.",
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
