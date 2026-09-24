"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, MapPin, Clock, Briefcase, ExternalLink } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { EmptyCard, SkeletonRows, ChipToggle } from "@/components/shared/dashboard-ui";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import { CommunitiesDirectory } from "@/components/shared/communities-directory";
import { getExternalJobs } from "@/lib/services/external-jobs";
import { useDebounce } from "@/hooks/use-debounce";
import { ExternalJob, ExternalSource } from "@/types/external-jobs";
import { timeAgo } from "@/lib/utils";

/**
 * Only terms the feed can actually return. The old list carried design,
 * software development, writing and marketing from when this aggregated
 * general job boards — on a photo/video feed those chips are guaranteed
 * dead ends, which reads as a broken filter rather than an empty niche.
 */
const FEATURED_TAGS = [
  "video",
  "photo",
  "camera",
  "editing",
  "drone",
  "broadcast",
];

export default function DiscoverPage() {
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [sources, setSources] = useState<{ name: ExternalSource; url: string }[]>([]);
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
      setSources(data.sources);
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
            <p className="eyebrow mb-2">Photo &amp; video work from around the web</p>
            <h1 className="font-display mb-3 text-4xl font-semibold tracking-tight md:text-5xl">
              More shoots and edits
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Live camera, edit and post-production listings from{" "}
              {sources.map((s, i) => (
                <span key={s.name}>
                  {i > 0 && i === sources.length - 1 ? " and " : i > 0 ? ", " : ""}
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener"
                    className="link-editorial font-medium text-foreground"
                  >
                    {s.name}
                  </a>
                </span>
              ))}
              . Full-time roles are filtered out.
            </p>
          </div>

          {/* These are not Jayree projects — say so plainly. */}
          <div className="mb-8 flex flex-col items-start justify-between gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              These listings are hosted on other job boards — you apply there
              directly, and they aren&apos;t covered by Jayree&apos;s milestone
              escrow.
            </p>
            <Link
              href="/projects"
              className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:text-brand-deep"
            >
              Browse escrow-protected Jayree projects
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mb-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 focus-within:border-foreground/50">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by role, company or craft…"
              className="h-11 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            <ChipToggle active={activeTag === ""} onClick={() => setActiveTag("")}>
              All
            </ChipToggle>
            {FEATURED_TAGS.map((t) => (
              <ChipToggle
                key={t}
                active={activeTag === t}
                onClick={() => setActiveTag(activeTag === t ? "" : t)}
              >
                {t}
              </ChipToggle>
            ))}
          </div>

          <p className="mb-5 text-sm text-muted-foreground">
            {isLoading
              ? "Loading listings…"
              : `${jobs.length} freelance listing${jobs.length === 1 ? "" : "s"}`}
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
                  className="card-lift group block rounded-xl border border-border bg-card p-5 md:p-6"
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

                      <h2 className="font-display mb-1 flex items-center gap-1.5 text-lg font-semibold leading-snug">
                        {job.position}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </h2>
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
                      {job.salary && (
                        <p className="font-display text-base font-semibold leading-none">
                          {job.salary}
                        </p>
                      )}
                      <p className="mt-1.5 flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <EmptyCard
              icon={Briefcase}
              title="No listings match that search"
              description="Only contract and freelance roles are shown here — full-time listings are filtered out, so results are intentionally narrow. Try a broader term."
              actionLabel="Clear filters"
              onAction={() => {
                setSearchInput("");
                setActiveTag("");
              }}
            />
          )}

          <div className="mt-14 border-t border-border pt-12">
            <CommunitiesDirectory defaultFocus="photo" />
          </div>

          <p className="mt-10 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Refreshed every 30 minutes from{" "}
            {sources.map((s, i) => (
              <span key={s.name}>
                {i > 0 && " · "}
                <a href={s.url} target="_blank" rel="noopener" className="link-editorial">
                  {s.name}
                </a>
              </span>
            ))}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
