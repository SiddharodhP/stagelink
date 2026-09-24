"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, Users, X } from "lucide-react";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
  Field,
  inputClass,
  selectClass,
  blurOnWheel,
} from "@/components/shared/dashboard-ui";
import { FreelancerCard, ClientCard } from "@/components/shared/person-card";
import { searchPeople, getOpenProjectCounts } from "@/lib/services/profiles";
import { CityCombobox } from "@/components/shared/city-combobox";
import { getSkillsList } from "@/lib/services/projects";
import { PeopleFilters, Profile } from "@/types/marketplace";
import { cn } from "@/lib/utils";

const SORTS = [
  { value: "relevance", label: "Most complete" },
  { value: "rating", label: "Highest rated" },
  { value: "rate_asc", label: "Lowest rate" },
  { value: "rate_desc", label: "Highest rate" },
  { value: "newest", label: "Newest" },
] as const;

const EMPTY: Omit<PeopleFilters, "role"> = {
  q: "",
  city: "",
  skill: "",
  availability: "",
  sort: "relevance",
};

const ROLES = [
  { key: "freelancer", label: "Freelancers" },
  { key: "client", label: "Clients" },
] as const;

function DirectoryInner() {
  const router = useRouter();
  const params = useSearchParams();

  const [people, setPeople] = useState<Profile[]>([]);
  const [openCounts, setOpenCounts] = useState<Record<string, number>>({});
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // URL is the source of truth so a filtered view can be shared or linked.
  const [filters, setFilters] = useState<PeopleFilters>({
    ...EMPTY,
    role: params.get("role") === "client" ? "client" : "freelancer",
    q: params.get("q") || "",
    city: params.get("city") || "",
    skill: params.get("skill") || "",
  });
  const isFreelancerView = filters.role === "freelancer";
  const [searchInput, setSearchInput] = useState(params.get("q") || "");

  useEffect(() => {
    getSkillsList().then(({ data }) => setSkills(data));
  }, []);

  // Cancellation matters here: changing filters quickly fires overlapping
  // requests, and without this a slow earlier response can land last and
  // overwrite the results for the filters actually on screen.
  useEffect(() => {
    let cancelled = false;
    searchPeople(filters).then(async ({ data }) => {
      if (cancelled) return;
      setPeople(data);
      setLoading(false);
      // Only clients need the "is this person hiring right now" number.
      if (filters.role === "client" && data.length) {
        const { data: counts } = await getOpenProjectCounts(data.map((p) => p.id));
        if (!cancelled) setOpenCounts(counts);
      } else {
        setOpenCounts({});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const apply = (patch: Partial<PeopleFilters>) => {
    const next = { ...filters, ...patch };
    setLoading(true);
    setFilters(next);
    const qs = new URLSearchParams();
    if (next.role === "client") qs.set("role", "client");
    if (next.q) qs.set("q", next.q);
    if (next.city) qs.set("city", next.city);
    if (next.skill) qs.set("skill", next.skill);
    router.replace(qs.toString() ? `/people?${qs}` : "/people", {
      scroll: false,
    });
  };

  const activeCount = [
    filters.city,
    filters.skill,
    filters.availability,
    filters.maxRate,
    filters.minRating,
    filters.verifiedOnly,
    filters.remoteOnly,
  ].filter(Boolean).length;

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-28 md:pt-32">
      <PageHeader
        eyebrow="Directory"
        title="Find people"
        description={
          isFreelancerView
            ? "Browse photographers, videographers and editors by city, craft and availability. Every profile shows real work, real ratings and what they charge."
            : "Browse the companies and people hiring on Jayree. See who's posting work right now and what they've paid out."
        }
      />

      {/* Which side of the marketplace you're looking at. */}
      <div className="mb-6 inline-flex rounded-full border border-border bg-card p-1">
        {ROLES.map((r) => (
          <button
            key={r.key}
            onClick={() => apply({ role: r.key, skill: "", availability: "" })}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-colors",
              filters.role === r.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            apply({ q: searchInput.trim() });
          }}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${inputClass} pl-11`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              isFreelancerView
                ? "Try “wedding photographer” or “drone operator”"
                : "Search by name or company"
            }
            aria-label={isFreelancerView ? "Search freelancers" : "Search clients"}
          />
        </form>

        <select
          className={`${selectClass} sm:w-52`}
          value={filters.sort}
          onChange={(e) => apply({ sort: e.target.value as PeopleFilters["sort"] })}
          aria-label="Sort results"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <Button
          variant="outline"
          className="rounded-full sm:w-auto"
          onClick={() => setShowFilters((v) => !v)}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {showFilters && (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="City" htmlFor="f_city">
            <CityCombobox
              id="f_city"
              value={filters.city || ""}
              placeholder="Anywhere"
              onChange={(c) => apply({ city: c?.name || "" })}
            />
          </Field>

          {isFreelancerView && (
          <Field label="Skill" htmlFor="f_skill">
            <select
              id="f_skill"
              className={selectClass}
              value={filters.skill}
              onChange={(e) => apply({ skill: e.target.value })}
            >
              <option value="">Any skill</option>
              {skills.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          )}

          {isFreelancerView && (
          <Field label="Availability" htmlFor="f_avail">
            <select
              id="f_avail"
              className={selectClass}
              value={filters.availability}
              onChange={(e) =>
                apply({ availability: e.target.value as PeopleFilters["availability"] })
              }
            >
              <option value="">Any</option>
              <option value="available">Available now</option>
              <option value="limited">Limited</option>
            </select>
          </Field>
          )}

          {isFreelancerView && (
          <Field label="Max rate ($/hr)" htmlFor="f_rate">
            <input
              id="f_rate"
              type="number"
              onWheel={blurOnWheel}
              min={0}
              className={inputClass}
              value={filters.maxRate ?? ""}
              onChange={(e) =>
                apply({ maxRate: e.target.value ? Number(e.target.value) : undefined })
              }
              placeholder="No limit"
            />
          </Field>
          )}

          <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={Boolean(filters.verifiedOnly)}
                onChange={(e) => apply({ verifiedOnly: e.target.checked })}
              />
              Verified only
            </label>
            {isFreelancerView && (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(filters.remoteOnly)}
                  onChange={(e) => apply({ remoteOnly: e.target.checked })}
                />
                Works remotely
              </label>
            )}
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={filters.minRating === 4}
                onChange={(e) => apply({ minRating: e.target.checked ? 4 : undefined })}
              />
              4★ and above
            </label>

            {activeCount > 0 && (
              <button
                onClick={() => {
                  setFilters({ ...EMPTY, role: filters.role });
                  setSearchInput("");
                  router.replace(
                    filters.role === "client" ? "/people?role=client" : "/people",
                    { scroll: false }
                  );
                }}
                className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonRows count={6} height={196} />
      ) : people.length > 0 ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {people.length}{" "}
            {isFreelancerView
              ? people.length === 1
                ? "creator"
                : "creators"
              : people.length === 1
                ? "client"
                : "clients"}
            {filters.city ? ` in ${filters.city}` : ""}
            {filters.skill ? ` · ${filters.skill}` : ""}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) =>
              isFreelancerView ? (
                <FreelancerCard key={p.id} profile={p} />
              ) : (
                <ClientCard
                  key={p.id}
                  profile={p}
                  openProjects={openCounts[p.id] || 0}
                />
              )
            )}
          </div>
        </>
      ) : (
        <EmptyCard
          icon={Users}
          title="Nobody matches that yet"
          description={
            activeCount > 0 || filters.q
              ? isFreelancerView
                ? "Try a wider search — fewer filters, or a nearby city. Freelancers who work remotely show up in every city."
                : "Try a wider search — fewer filters, or a nearby city."
              : isFreelancerView
                ? "The directory is still filling up. Post a project instead and let creators come to you."
                : "No clients listed yet. Browse open projects to see what's being hired for right now."
          }
          actionLabel={
            activeCount > 0 || filters.q
              ? "Clear filters"
              : isFreelancerView
                ? "Post a project"
                : "Browse projects"
          }
          actionHref={
            activeCount > 0 || filters.q
              ? undefined
              : isFreelancerView
                ? "/projects/new"
                : "/projects"
          }
          onAction={
            activeCount > 0 || filters.q
              ? () => {
                  setFilters({ ...EMPTY, role: filters.role });
                  setSearchInput("");
                  router.replace(
                    filters.role === "client" ? "/people?role=client" : "/people",
                    { scroll: false }
                  );
                }
              : undefined
          }
        />
      )}
      </div>
      <Footer />
    </>
  );
}

export default function FreelancersPage() {
  return (
    <Suspense fallback={<SkeletonRows count={6} height={196} />}>
      <DirectoryInner />
    </Suspense>
  );
}
