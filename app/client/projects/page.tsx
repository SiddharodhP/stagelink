"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Briefcase, PlusCircle, Trash2, Users, ArrowUpRight, XCircle } from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
} from "@/components/shared/dashboard-ui";
import { ProjectStatusPill } from "@/components/shared/marketplace-ui";
import {
  getClientProjects,
  deleteDraft,
  cancelProject,
  publishProject,
} from "@/lib/services/projects";
import { Profile, Project } from "@/types/marketplace";
import { formatPrice, timeAgo, cn } from "@/lib/utils";

const TABS = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In progress" },
  { key: "draft", label: "Drafts" },
  { key: "completed", label: "Completed" },
] as const;

function ProjectsPage({ profile }: { profile: Profile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");

  const load = () => {
    getClientProjects(profile.id).then(({ data }) => {
      setProjects(data);
      setLoading(false);
    });
  };

  useEffect(load, [profile.id]);

  const filtered = projects.filter((p) => {
    if (tab === "all") return true;
    if (tab === "in_progress") return ["awarded", "in_progress"].includes(p.status);
    return p.status === tab;
  });

  const counts = {
    all: projects.length,
    open: projects.filter((p) => p.status === "open").length,
    in_progress: projects.filter((p) => ["awarded", "in_progress"].includes(p.status)).length,
    draft: projects.filter((p) => p.status === "draft").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  const handlePublish = async (p: Project) => {
    const { error } = await publishProject(p.id);
    if (error) {
      toast.error(error.message || "Could not publish — add at least one milestone first");
      return;
    }
    toast.success("Project published");
    load();
  };

  const handleCancel = async (p: Project) => {
    const { error } = await cancelProject(p.id);
    if (error) {
      toast.error(error.message || "Could not cancel this project");
      return;
    }
    toast.success("Project cancelled");
    load();
  };

  const handleDelete = async (p: Project) => {
    const { error } = await deleteDraft(p.id);
    if (error) {
      toast.error(error.message || "Could not delete this draft");
      return;
    }
    toast.success("Draft deleted");
    load();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Client workspace"
        title="My projects"
        description="Everything you've posted, from drafts to completed work."
        action={
          <Button asChild className="rounded-full bg-ink px-6 text-paper hover:bg-ink-soft">
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Post a project
            </Link>
          </Button>
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-ink text-paper"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {t.label}
            <span className="ml-1.5 opacity-60">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonRows count={3} height={120} />
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((p) => (
            <article key={p.id} className="rounded-xl border border-border bg-white p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2.5">
                    <ProjectStatusPill status={p.status} />
                    <span className="text-xs text-muted-foreground">
                      {p.published_at ? `Posted ${timeAgo(p.published_at)}` : "Not published"}
                    </span>
                  </div>
                  <h3 className="font-display mb-1 text-xl font-semibold leading-snug">
                    {p.status === "draft" ? (
                      p.title
                    ) : (
                      <Link href={`/projects/${p.id}`} className="hover:text-brand">
                        {p.title}
                      </Link>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(p.budget_total)} · {p.milestones?.length ?? 0} milestones
                    {p.status !== "draft" && ` · ${p.bids_count} bid${p.bids_count === 1 ? "" : "s"}`}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {p.status === "draft" ? (
                    <>
                      <Button
                        size="sm"
                        className="rounded-full bg-ink text-paper hover:bg-ink-soft"
                        onClick={() => handlePublish(p)}
                      >
                        Publish
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-muted-foreground hover:text-red-600"
                        onClick={() => handleDelete(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <Link href={`/projects/${p.id}`}>
                          {p.status === "open" && p.bids_count > 0 ? (
                            <>
                              <Users className="mr-1.5 h-3.5 w-3.5" /> Review {p.bids_count} bid
                              {p.bids_count === 1 ? "" : "s"}
                            </>
                          ) : (
                            <>
                              View <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                            </>
                          )}
                        </Link>
                      </Button>
                      {p.status === "open" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full text-muted-foreground hover:text-red-600"
                          onClick={() => handleCancel(p)}
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyCard
          icon={Briefcase}
          title={tab === "all" ? "No projects yet" : `No ${tab.replace("_", " ")} projects`}
          description="Post a project with clear milestones and freelancers will start bidding within hours."
          actionLabel="Post a project"
          actionHref="/projects/new"
        />
      )}
    </div>
  );
}

export default function ClientProjectsPage() {
  return (
    <WorkspaceShell role="client">{(profile) => <ProjectsPage profile={profile} />}</WorkspaceShell>
  );
}
