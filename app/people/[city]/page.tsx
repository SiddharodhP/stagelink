import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck, Star, ArrowUpRight } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { JsonLd } from "@/components/shared/json-ld";
import { Button } from "@/components/ui/button";
import { buildMetadata, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import {
  getCityBySlug,
  getCitiesWithFreelancers,
  getFreelancersForCity,
  SeoFreelancer,
} from "@/lib/seo-data";
import { formatPrice } from "@/lib/utils";

// Refresh hourly — new freelancers appear without a redeploy.
export const revalidate = 3600;

interface Props {
  params: Promise<{ city: string }>;
}

/**
 * Only cities that actually have freelancers are pre-rendered.
 *
 * The cities table is worldwide — around 34,000 rows — so building a page
 * each would produce 34,000 empty pages, which is thin content that drags
 * the whole domain down rather than ranking. Everything else still
 * resolves on demand through ISR.
 */
export async function generateStaticParams() {
  const cities = await getCitiesWithFreelancers();
  return cities.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) {
    return buildMetadata({
      title: "City not found",
      description: "This city page does not exist.",
      path: `/people/${slug}`,
      noIndex: true,
    });
  }

  // Don't invite Google to index a page with nobody on it.
  const people = await getFreelancersForCity(city.name, undefined, 1);
  const n = city.name;
  return buildMetadata({
    noIndex: people.length === 0,
    title: `Photographers & Videographers in ${n} — Hire Freelancers`,
    description: `Find and book freelance photographers, videographers and video editors in ${n}, ${city.state}. Compare portfolios, ratings and day rates. Milestone payments held in escrow until you approve the work.`,
    path: `/people/${slug}`,
    keywords: [
      `photographers in ${n}`,
      `videographers in ${n}`,
      `freelance photographer ${n}`,
      `wedding photographer ${n}`,
      `video editor ${n}`,
      `hire photographer ${n}`,
      `product photography ${n}`,
      `drone operator ${n}`,
    ],
  });
}

function PersonRow({ p }: { p: SeoFreelancer }) {
  const place = [p.city, p.state].filter(Boolean).join(", ");
  return (
    <Link
      href={`/u/${p.id}`}
      className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-secondary"
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {p.full_name || "Freelancer"}
          {p.is_verified && (
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-label="Verified" />
          )}
          {p.total_reviews > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {p.avg_rating.toFixed(1)} ({p.total_reviews})
            </span>
          )}
        </p>
        {p.headline && (
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {p.headline}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {place || "Remote"}
          {p.works_remotely && place ? " · works remotely" : ""}
          {p.skills.length > 0 ? ` · ${p.skills.slice(0, 3).join(", ")}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-right">
        {p.hourly_rate ? (
          <span className="font-display font-semibold">
            {formatPrice(p.hourly_rate)}
            <span className="text-xs font-normal text-muted-foreground">/hr</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Rate on request</span>
        )}
      </span>
    </Link>
  );
}

export default async function CityPage({ params }: Props) {
  const { city: slug } = await params;
  const city = await getCityBySlug(slug);
  if (!city) notFound();

  // Cross-links point at cities that HAVE people — linking to 34,000 empty
  // pages would spread crawl budget across nothing.
  const [people, populated] = await Promise.all([
    getFreelancersForCity(city.name),
    getCitiesWithFreelancers(),
  ]);

  const nearby = populated
    .filter((c) => c.slug !== city.slug && c.state === city.state)
    .slice(0, 6);
  const metros = populated
    .filter((c) => c.slug !== city.slug && c.state !== city.state)
    .slice(0, 8);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "People", path: "/people" },
          { name: city.name, path: `/people/${city.slug}` },
        ])}
      />
      {people.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Photographers and videographers in ${city.name}`,
            numberOfItems: people.length,
            itemListElement: people.map((p, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_URL}/u/${p.id}`,
              name: p.full_name || "Freelancer",
            })),
          }}
        />
      )}

      <Navbar />

      <main className="mx-auto max-w-4xl px-4 py-12">
        <p className="eyebrow mb-3 flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> {city.name}, {city.state}
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Photographers &amp; videographers in {city.name}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Browse freelance photographers, videographers and editors working in{" "}
          {city.name}. Compare portfolios and day rates, then pay by milestone —
          money is held until you approve the work.
        </p>

        <div className="mt-8">
          {people.length > 0 ? (
            <>
              <h2 className="font-display mb-3 text-xl font-semibold">
                {people.length} available{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  in and around {city.name}
                </span>
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-white">
                {people.map((p) => (
                  <PersonRow key={p.id} p={p} />
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild className="rounded-full bg-ink text-paper hover:bg-ink-soft">
                  <Link href={`/people?city=${encodeURIComponent(city.name)}`}>
                    Filter by skill and rate
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/projects/new">Post a project instead</Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
              <h2 className="font-display mb-2 text-xl font-semibold">
                No one listed in {city.name} yet
              </h2>
              <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
                Post your project and photographers across India — including
                those who travel or work remotely — can bid on it.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild className="rounded-full bg-ink text-paper hover:bg-ink-soft">
                  <Link href="/projects/new">Post a project</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/people">Browse everyone</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Internal links: these are what let the city pages rank as a set
            rather than as 53 orphans. */}
        {nearby.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display mb-3 text-lg font-semibold">
              Also in {city.state}
            </h2>
            <div className="flex flex-wrap gap-2">
              {nearby.map((c) => (
                <Link
                  key={c.slug}
                  href={`/people/${c.slug}`}
                  className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-display mb-3 text-lg font-semibold">Other cities</h2>
          <div className="flex flex-wrap gap-2">
            {metros.map((c) => (
              <Link
                key={c.slug}
                href={`/people/${c.slug}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                {c.name} <ArrowUpRight className="h-3.5 w-3.5 opacity-50" />
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
