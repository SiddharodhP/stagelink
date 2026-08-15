"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, MapPin, Clock, Briefcase, ExternalLink } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { EmptyCard, SkeletonRows, ChipToggle } from "@/components/shared/dashboard-ui";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import { getExternalJobs } from "@/lib/services/external-jobs";
import { useDebounce } from "@/hooks/use-debounce";
import { ExternalJob } from "@/types/external-jobs";
import { formatUSD, timeAgo, cn } from "@/lib/utils";

const FEATURED_TAGS = [
  "dev", "design", "javascript", "python", "marketing",
  "writing", "customer support", "product", "sales", "finance",
];

export default function DiscoverPage() {
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [sourceUrl, setSourceUrl] = useState("https://remoteok.com");
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getExternalJobs({ q: debouncedSearch, tag: activeTag }).then(({ data }) => {
      if (!mounted) return;
      setJobs(data.jobs);
      setSourceUrl(data.sourceUrl);
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [debouncedSearch, activeTag]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 pb-24 pt-28 md:pt-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-6">
            <p className="eyebrow mb-2">Live from Remote OK</p>
            <h1 className="font-display mb-3 text-4xl font-semibold tracking-tight md:text-5xl">
              More work, from around the web
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Real listings refreshed straight from{" "}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener"
                className="link-editorial font-medium text-foreground"
              >
                Remote OK
              </a>
              , for whoever lands here before Roster's own board is full.
            </p>
          </div>

          {/* Honesty banner — these aren't Roster projects */}
          <div className="mb-8 flex flex-col items-start justify-between gap-3 rounded-xl border border-border bg-white p-5 sm:flex-row sm:items-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              These roles are hosted on <strong className="text-foreground">Remote OK</strong>, not
              Roster — you'll apply there directly, and they aren't covered by
              Roster's milestone escrow.
            </p>
            <Link
              href="/projects"
              className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:text-brand-deep"
            >
              Browse escrow-protected Roster projects
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Search */}
          <div className="mb-4 flex items-center gap-2 rounded-full border border-border bg-white px-4 focus-within:border-ink/50">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title, company, or tag…"
              className="h-11 w-full bg-transparent text-sm outline-none"
            />
          </div>

          {/* Tag chips */}
          <div className="mb-8 flex flex-wrap gap-2">
            <ChipToggle active={activeTag === ""} onClick={() => setActiveTag("")}>
              All
            </ChipToggle>
            {FEATURED_TAGS.map((t) => (
              <ChipToggle key={t} active={activeTag === t} onClick={() => setActiveTag(activeTag === t ? "" : t)}>
                {t}
              </ChipToggle>
            ))}
          </div>

          <p className="mb-5 text-sm text-muted-foreground">
            {isLoading ? "Loading listings…" : `${jobs.length} listing${jobs.length === 1 ? "" : "s"}`}
          </p>

          {isLoading ? (
            <SkeletonRows count={5} height={128} />
          ) : jobs.length > 0 ? (
            <div className="space-y-4">
              {jobs.map((job) => (
                <a
                  key={job.id}
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener"
                  className="card-lift group block rounded-xl border border-border bg-white p-5 md:p-6"
                >
                  <div className="flex items-start gap-4">
                    <UserAvatar name={job.company} src={job.companyLogo || undefined} size={48} />

                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                          via {job.source}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(job.postedAt)}
                        </span>
                      </div>

                      <h3 className="font-display mb-1 flex items-center gap-1.5 text-lg font-semibold leading-snug">
                        {job.position}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </h3>
                      <p className="mb-3 text-sm text-muted-foreground">{job.company}</p>

                      <div className="flex flex-wrap gap-1.5">
                        {job.tags.slice(0, 5).map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-foreground/80"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="hidden shrink-0 text-right sm:block">
                      {job.salaryMin > 0 && (
                        <p className="font-display text-lg font-semibold leading-none">
                          {formatUSD(job.salaryMin)}
                          {job.salaryMax > job.salaryMin && `–${formatUSD(job.salaryMax)}`}
                        </p>
                      )}
                      <p className="mt-1.5 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 sm:hidden">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {job.location}
                    </span>
                    {job.salaryMin > 0 && (
                      <span className="font-display text-sm font-semibold">
                        {formatUSD(job.salaryMin)}
                        {job.salaryMax > job.salaryMin && `+`}
                      </span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <EmptyCard
              icon={Briefcase}
              title="No listings match that search"
              description="Try a broader search term or clear the tag filter."
              actionLabel="Clear filters"
              onAction={() => {
                setSearchInput("");
                setActiveTag("");
              }}
            />
          )}

          <p className="mt-10 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Listings refresh roughly every 30 minutes, sourced from{" "}
            <a href={sourceUrl} target="_blank" rel="noopener" className="link-editorial">
              Remote OK
            </a>
            .
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
