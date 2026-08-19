import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ShieldCheck, ListChecks, Gavel } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProjectCard } from "@/components/shared/project-card";
import { JsonLd } from "@/components/shared/json-ld";
import { Button } from "@/components/ui/button";
import { buildMetadata, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import {
  getCategoryBySlug,
  getAllCategories,
  getCategoryProjects,
} from "@/lib/seo-data";
import { Project } from "@/types/marketplace";

// Refresh hourly — new projects appear without a redeploy.
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

/** Pre-render every category page at build time for fast, indexable HTML. */
export async function generateStaticParams() {
  const categories = await getAllCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) {
    return buildMetadata({
      title: "Category not found",
      description: "This category does not exist.",
      path: `/projects/category/${slug}`,
      noIndex: true,
    });
  }

  const name = category.name;
  const lower = name.toLowerCase();

  return buildMetadata({
    title: `Hire ${name} Freelancers — Milestone-Based ${name} Projects`,
    description: `Find freelance ${lower} projects with fixed milestone budgets and escrow-protected payments. Compare bids from vetted ${lower} freelancers and pay only for approved work.`,
    path: `/projects/category/${slug}`,
    keywords: [
      `hire ${lower} freelancers`,
      `freelance ${lower} projects`,
      `${lower} freelance jobs`,
      `find ${lower} freelancer online`,
      `${lower} freelancer with escrow payment`,
    ],
  });
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [projects, allCategories] = await Promise.all([
    getCategoryProjects(category.id, 20),
    getAllCategories(),
  ]);

  const name = category.name;
  const lower = name.toLowerCase();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Open ${name} freelance projects`,
    numberOfItems: projects.length,
    itemListElement: projects.slice(0, 20).map((p: any, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/projects/${p.id}`,
      name: p.title,
    })),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Projects", path: "/projects" },
            { name, path: `/projects/category/${slug}` },
          ]),
          itemListJsonLd,
        ]}
      />
      <Navbar />

      <main className="flex-1 pb-24 pt-28 md:pt-32">
        <div className="container mx-auto px-4 md:px-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span>/</span>
            <Link href="/projects" className="hover:text-foreground">Projects</Link>
            <span>/</span>
            <span className="text-foreground">{name}</span>
          </nav>

          {/* H1 targets the primary keyword for this category */}
          <header className="mb-10 max-w-3xl">
            <p className="eyebrow mb-2">{name}</p>
            <h1 className="font-display mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Hire {lower} freelancers
            </h1>
            {/* Built as one template literal: a multi-line JSX text node
                that follows an expression loses its leading space. */}
            <p className="text-lg leading-relaxed text-muted-foreground">
              {`Every ${lower} project on Roster is split into milestones with a fixed price and deliverables agreed upfront. Freelancers see the full plan before bidding, and each milestone is funded into escrow before work starts — so you only pay for work you've approved.`}
            </p>
          </header>

          {/* Value props — real content for the crawler, useful for humans */}
          <div className="mb-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
            {[
              {
                icon: ListChecks,
                title: `Scoped ${lower} milestones`,
                text: `Each stage of the ${lower} work has its own deliverables, deadline, and payment amount — no vague briefs.`,
              },
              {
                icon: Gavel,
                title: "Competitive bids",
                text: `Compare ${lower} freelancers on price, delivery time, portfolio, and verified review history — not price alone.`,
              },
              {
                icon: ShieldCheck,
                title: "Escrow on every milestone",
                text: "Funds are held by the platform and released only when you approve the delivered work.",
              },
            ].map((b) => (
              <div key={b.title} className="bg-background p-6">
                <b.icon className="mb-4 h-5 w-5 text-brand" />
                <h2 className="mb-2 text-base font-semibold">{b.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>

          {/* Live projects */}
          <section className="mb-16">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Open {lower} projects
              </h2>
              <Link
                href="/projects"
                className="flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-deep"
              >
                All projects <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {projects.length > 0 ? (
              <div className="space-y-4">
                {projects.map((p: any) => (
                  <ProjectCard key={p.id} project={p as Project} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
                <p className="font-display mb-2 text-xl font-semibold">
                  No open {lower} projects right now
                </p>
                <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
                  New projects are posted regularly. Post one yourself, or browse
                  every open project across all categories.
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <Button asChild className="rounded-full bg-ink text-paper hover:bg-ink-soft">
                    <Link href="/projects/new">Post a {lower} project</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/projects">Browse all projects</Link>
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Internal links — spreads crawl equity across all category pages */}
          <section className="border-t border-border pt-10">
            <h2 className="eyebrow mb-4">Browse other categories</h2>
            <div className="flex flex-wrap gap-2">
              {allCategories
                .filter((c) => c.slug !== slug)
                .map((c) => (
                  <Link
                    key={c.slug}
                    href={`/projects/category/${c.slug}`}
                    className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium transition-colors hover:border-ink/40"
                  >
                    {c.name}
                  </Link>
                ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
