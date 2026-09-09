"use client";

import Link from "next/link";
import { Heart, Clock, ListChecks, Users } from "lucide-react";
import { Project } from "@/types/marketplace";
import { formatPrice, timeAgo, cn, displayName, partyName } from "@/lib/utils";
import {
  NameWithBadge,
  SkillTags,
  UserAvatar,
} from "@/components/shared/marketplace-ui";

interface ProjectCardProps {
  project: Project;
  saved?: boolean;
  onToggleSave?: (projectId: string, save: boolean) => void;
  showSave?: boolean;
}

/** Information-dense list card — reads like a job board row, not a tile. */
export function ProjectCard({ project, saved, onToggleSave, showSave }: ProjectCardProps) {

  return (
    <article className="card-lift relative rounded-xl border border-border bg-card p-5 md:p-6">
      <Link href={`/projects/${project.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">View {project.title}</span>
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs text-muted-foreground">
            {project.published_at ? `Posted ${timeAgo(project.published_at)}` : "Draft"}
            {project.category?.name && <> · {project.category.name}</>}
          </p>
          <h3 className="font-display mb-2 break-words text-xl font-semibold leading-snug tracking-tight">
            {project.title}
          </h3>
          <p className="mb-3 line-clamp-2 max-w-3xl break-words text-sm leading-relaxed text-muted-foreground">
            {project.description}
          </p>
          <SkillTags skills={project.skills} max={5} />
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <p className="font-display text-2xl font-semibold leading-none">
            {formatPrice(project.budget_total)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">fixed · milestones</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <UserAvatar
            name={displayName(project.client)}
            src={project.client?.avatar_url}
            size={28}
          />
          <span className="truncate text-sm text-foreground/80">
            <NameWithBadge
              name={partyName(project.client)}
              verified={project.client?.is_verified}
            />
            {project.client?.location && (
              <span className="text-muted-foreground"> · {project.client.location}</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {project.bids_count} bid{project.bids_count === 1 ? "" : "s"}
          </span>
          {project.milestones && (
            <span className="flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5" />
              {project.milestones.length} milestones
            </span>
          )}
          {project.deadline && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              due {new Date(project.deadline).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
            </span>
          )}
          <span className="font-display text-base font-semibold text-foreground sm:hidden">
            {formatPrice(project.budget_total)}
          </span>
        </div>
      </div>

      {showSave && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleSave?.(project.id, !saved);
          }}
          aria-label={saved ? "Unsave project" : "Save project"}
          className="absolute right-4 top-4 z-20 rounded-full border border-border bg-white p-2 shadow-sm transition-colors hover:border-ink/40"
        >
          <Heart className={cn("h-4 w-4", saved ? "fill-brand text-brand" : "text-foreground/50")} />
        </button>
      )}
    </article>
  );
}
