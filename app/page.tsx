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
} from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/shared/project-card";
import { searchProjects, getCategories } from "@/lib/services/projects";
import { Category, Project } from "@/types/marketplace";
import { formatPrice } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    searchProjects({ sortBy: "newest", page: 1 }).then(({ data, count }) => {
      setProjects(data.slice(0, 3));
      setOpenCount(count);
    });
    getCategories().then(({ data }) => setCategories(data));
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
                        E-commerce site rebuild
                      </p>
                    </div>
                    <span className="font-display text-xl font-semibold">
                      {formatPrice(65000)}
                    </span>
                  </div>

                  <ol className="space-y-0">
                    {[
                      { n: 1, t: "UI design in Figma", a: 10000, s: "paid" },
                      { n: 2, t: "Frontend implementation", a: 20000, s: "paid" },
                      { n: 3, t: "Backend & integrations", a: 25000, s: "active" },
                      { n: 4, t: "Testing & deployment", a: 10000, s: "pending" },
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

        {/* ============ Category strip ============ */}
        <section className="border-y border-border bg-white py-4">
          <div className="overflow-hidden whitespace-nowrap" aria-hidden>
            <div className="animate-marquee inline-block">
              {[...categories, ...categories].map((c, i) => (
                <span
                  key={`${c.id}-${i}`}
                  className="mx-5 inline-flex items-center gap-5 text-sm font-medium uppercase tracking-[0.14em] text-foreground/50"
                >
                  {c.name}
                  <span className="text-brand">✳</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ============ Live projects ============ */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div {...fadeUp} className="mb-10 flex items-end justify-between">
              <div>
                <p className="eyebrow mb-3">
                  {openCount > 0 ? `${openCount} open right now` : "Live on the marketplace"}
                </p>
                <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                  Latest projects
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
              <div className="space-y-4">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-white px-6 py-16 text-center">
                <p className="font-display mb-2 text-2xl font-semibold">
                  The marketplace is just opening
                </p>
                <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                  Be the first to post a project — or sign up as a freelancer to
                  get in early.
                </p>
                <Button asChild className="rounded-full bg-ink text-paper hover:bg-ink-soft">
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

        {/* ============ For freelancers ============ */}
        <section id="for-freelancers" className="py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <motion.div {...fadeUp}>
                <p className="eyebrow mb-3">For freelancers</p>
                <h2 className="font-display mb-6 text-4xl font-semibold tracking-tight md:text-5xl">
                  Know what you&apos;re
                  <br />
                  agreeing to
                </h2>
                <p className="mb-8 max-w-lg text-lg leading-relaxed text-muted-foreground">
                  Before you accept a project, you see every milestone: what to
                  deliver, when it&apos;s due, and what it pays. If the structure
                  doesn&apos;t work for you, you decline — no obligation.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-ink px-8 text-base text-paper hover:bg-ink-soft"
                >
                  <Link href="/projects">
                    Browse open projects <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </motion.div>

              <motion.ul {...fadeUp} className="space-y-4">
                {[
                  ["You confirm the plan before starting", "The client's milestone structure needs your explicit agreement — it isn't imposed on you."],
                  ["Money is escrowed before work begins", "Each milestone is funded upfront. You never build on a promise."],
                  ["Reputation you actually own", "Every completed contract adds a public review from a real, paid engagement."],
                ].map(([title, text]) => (
                  <li key={title} className="rounded-xl border border-border bg-white p-6">
                    <p className="mb-1 font-semibold">{title}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </li>
                ))}
              </motion.ul>
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
