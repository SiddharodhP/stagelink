"use client";

import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, X, Briefcase } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ProjectCard } from "@/components/shared/project-card";
import { Button } from "@/components/ui/button";
import { EmptyCard, SkeletonRows, ChipToggle } from "@/components/shared/dashboard-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  searchProjects,
  getCategories,
  getSkillsList,
  getSavedProjectIds,
  toggleSavedProject,
  PROJECT_PAGE_SIZE,
} from "@/lib/services/projects";
import { getMyProfile } from "@/lib/services/auth";
import { useDebounce } from "@/hooks/use-debounce";
import { Category, Profile, Project, ProjectFilters } from "@/types/marketplace";
import { PROJECT_SORTS, BUDGET_PRESETS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const INITIAL: ProjectFilters = {
  search: "",
  categoryId: null,
  skills: [],
  budgetMin: null,
  budgetMax: null,
  maxBids: null,
  sortBy: "newest",
  page: 1,
};

export default function BrowseProjectsPage() {
  const [filters, setFilters] = useState<ProjectFilters>(INITIAL);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skillOptions, setSkillOptions] = useState<string[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [budgetPreset, setBudgetPreset] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  useEffect(() => {
    getCategories().then(({ data }) => setCategories(data));
    getSkillsList().then(({ data }) => setSkillOptions(data));
    getMyProfile().then(({ data }) => {
      setProfile(data);
      if (data) getSavedProjectIds(data.id).then(setSavedIds);
    });
  }, []);

  // The debounced search term is applied at query time rather than mirrored
  // into filter state, so there's only one source of truth per input.
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      const { data, count } = await searchProjects({
        ...filters,
        search: debouncedSearch,
      });
      if (!mounted) return;
      setProjects(data);
      setTotal(count);
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [filters, debouncedSearch]);

  const update = (patch: Partial<ProjectFilters>) =>
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const toggleSkill = (s: string) =>
    update({
      skills: filters.skills.includes(s)
        ? filters.skills.filter((x) => x !== s)
        : [...filters.skills, s],
    });

  const handleToggleSave = async (projectId: string, save: boolean) => {
    if (!profile) {
      toast.error("Log in to save projects");
      return;
    }
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (save) next.add(projectId);
      else next.delete(projectId);
      return next;
    });
    await toggleSavedProject(profile.id, projectId, save);
  };

  const activeCount =
    (filters.categoryId ? 1 : 0) +
    filters.skills.length +
    (budgetPreset > 0 ? 1 : 0) +
    (filters.maxBids != null ? 1 : 0);

  const totalPages = Math.max(1, Math.ceil(total / PROJECT_PAGE_SIZE));
  const sortLabel = PROJECT_SORTS.find((s) => s.value === filters.sortBy)?.label;

  const FilterPanel = (
    <aside className="rounded-xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Filters</h3>
        {activeCount > 0 && (
          <button
            onClick={() => {
              setFilters(INITIAL);
              setBudgetPreset(0);
            }}
            className="text-xs font-medium text-brand hover:text-brand-deep"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <div className="border-b border-border py-5">
        <h4 className="eyebrow mb-3">Category</h4>
        <select
          value={filters.categoryId ?? ""}
          onChange={(e) => update({ categoryId: e.target.value ? Number(e.target.value) : null })}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="border-b border-border py-5">
        <h4 className="eyebrow mb-3">Budget</h4>
        <div className="space-y-1">
          {BUDGET_PRESETS.map((b, i) => (
            <button
              key={b.label}
              onClick={() => {
                setBudgetPreset(i);
                update({ budgetMin: b.min, budgetMax: b.max });
              }}
              className="group flex w-full items-center gap-2.5 rounded-md px-1 py-1.5 text-left text-sm"
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border transition-all",
                  budgetPreset === i ? "border-foreground" : "border-foreground/30 group-hover:border-foreground/50"
                )}
              >
                {budgetPreset === i && <span className="h-2 w-2 rounded-full bg-foreground" />}
              </span>
              <span className={budgetPreset === i ? "font-medium" : "text-muted-foreground"}>
                {b.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-border py-5">
        <h4 className="eyebrow mb-3">Competition</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Under 5 bids", value: 4 },
            { label: "Under 10 bids", value: 9 },
          ].map((o) => (
            <ChipToggle
              key={o.value}
              active={filters.maxBids === o.value}
              onClick={() => update({ maxBids: filters.maxBids === o.value ? null : o.value })}
            >
              {o.label}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div className="py-5">
        <h4 className="eyebrow mb-3">Skills</h4>
        <div className="flex max-h-64 flex-wrap gap-2 overflow-y-auto">
          {skillOptions.map((s) => (
            <ChipToggle key={s} active={filters.skills.includes(s)} onClick={() => toggleSkill(s)}>
              {s}
            </ChipToggle>
          ))}
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 pb-24 pt-28 md:pt-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8">
            <p className="eyebrow mb-2">Find work</p>
            <h1 className="font-display mb-3 text-4xl font-semibold tracking-tight md:text-5xl">
              Open projects
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Every project lists its milestones and budget upfront — so you know
              exactly what you&apos;re bidding on before you write a word.
            </p>
          </div>

          {/* Search + sort */}
          <div className="mb-6 flex flex-col gap-3 md:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 focus-within:border-foreground/50">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setFilters((f) => (f.page === 1 ? f : { ...f, page: 1 }));
                }}
                placeholder="Search projects by title or description…"
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
              {searchInput && (
                <button onClick={() => setSearchInput("")} aria-label="Clear search">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="rounded-full lg:hidden"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Filters
                {activeCount > 0 && (
                  <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="min-w-[180px] justify-between rounded-full">
                    {sortLabel}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  {PROJECT_SORTS.map((s) => (
                    <DropdownMenuItem key={s.value} onClick={() => update({ sortBy: s.value as any })}>
                      {s.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-col gap-8 lg:flex-row">
            <AnimatePresence>
              {showMobileFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden lg:hidden"
                >
                  {FilterPanel}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="hidden w-72 shrink-0 lg:block">
              <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto pr-1">
                {FilterPanel}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-5 text-sm text-muted-foreground">
                {isLoading ? "Searching…" : `${total} open project${total === 1 ? "" : "s"}`}
              </p>

              {isLoading ? (
                <SkeletonRows count={4} height={180} />
              ) : projects.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {projects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        saved={savedIds.has(p.id)}
                        onToggleSave={handleToggleSave}
                        showSave={profile?.role === "freelancer"}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-10 flex justify-center gap-2">
                      <Button
                        variant="outline"
                        className="rounded-full"
                        disabled={filters.page === 1}
                        onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                      >
                        Previous
                      </Button>
                      <span className="flex items-center px-4 text-sm text-muted-foreground">
                        Page {filters.page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        className="rounded-full"
                        disabled={filters.page >= totalPages}
                        onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyCard
                  icon={Briefcase}
                  title="No projects match those filters"
                  description="Try widening the budget range or removing a skill — new projects are posted every day."
                  actionLabel="Clear all filters"
                  onAction={() => {
                    setFilters(INITIAL);
                    setBudgetPreset(0);
                    setSearchInput("");
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
