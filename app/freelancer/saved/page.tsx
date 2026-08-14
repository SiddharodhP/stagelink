"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageHeader, EmptyCard, SkeletonRows } from "@/components/shared/dashboard-ui";
import { ProjectCard } from "@/components/shared/project-card";
import { getSavedProjects, toggleSavedProject } from "@/lib/services/projects";
import { Profile, Project } from "@/types/marketplace";

function SavedPage({ profile }: { profile: Profile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSavedProjects(profile.id).then(({ data }) => {
      setProjects(data);
      setLoading(false);
    });
  }, [profile.id]);

  const unsave = async (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    await toggleSavedProject(profile.id, projectId, false);
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Freelancer workspace"
        title="Saved projects"
        description="Projects you've bookmarked to bid on later."
      />

      {loading ? (
        <SkeletonRows count={3} height={160} />
      ) : projects.length > 0 ? (
        <div className="space-y-4">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              saved
              showSave
              onToggleSave={(id) => unsave(id)}
            />
          ))}
        </div>
      ) : (
        <EmptyCard
          icon={Heart}
          title="Nothing saved yet"
          description="Tap the heart on any project to keep it here while you decide whether to bid."
          actionLabel="Browse projects"
          actionHref="/projects"
        />
      )}
    </div>
  );
}

export default function FreelancerSavedPage() {
  return (
    <WorkspaceShell role="freelancer">{(profile) => <SavedPage profile={profile} />}</WorkspaceShell>
  );
}
