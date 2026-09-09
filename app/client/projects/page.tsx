"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Briefcase,
  PlusCircle,
  Trash2,
  Users,
  ArrowUpRight,
  XCircle,
  FileSignature,
  Wallet,
  ListChecks,
  Clock,
} from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
} from "@/components/shared/dashboard-ui";
import {
  ProjectStatusPill,
  ContractStatusPill,
  MilestoneStatusPill,
  UserAvatar,
} from "@/components/shared/marketplace-ui";
import {
  getClientProjects,
  deleteDraft,
  cancelProject,
  publishProject,
} from "@/lib/services/projects";
import { getMyContracts } from "@/lib/services/contracts";
import { Contract, Profile, Project } from "@/types/marketplace";
import { formatPrice, timeAgo, cn, displayName } from "@/lib/utils";

/**
 * One list for everything the client has posted.
 *
 * This used to be two sidebar entries — "My projects" with five tabs and
 * "Contracts" with four more — which meant the same piece of work appeared
 * in two places under two different names, and you had to know that a
 * project becomes a contract when it is awarded in order to find it.
 *
 * A contract is not a separate thing to manage; it is a stage a project
 * reaches. So there is one list, split only by whether the work is still
 * going, and everything that used to be a tab is now a tag on the card.
 */

const TABS = [
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const ONGOING = ["draft", "open", "awarded", "in_progress"];

/** Neutral fact about a project — money, counts, timing. */
function Tag({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {children}
    </span>
  );
}

/**
 * A project can carry more than one contract if an award was declined and
 * the work re-awarded. The live one is what the card should reflect, so
 * rank by how current the status is and fall back to the newest.
 */
const CONTRACT_RANK: Record<string, number> = {
  active: 0,
  pending_acceptance: 1,
  completed: 2,
  cancelled: 3,
  declined: 4,
};

function ProjectsPage({ profile }: { profile: Profile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("ongoing");

  const load = useCallback(() => {
    Promise.all([
      getClientProjects(profile.id),
      getMyContracts(profile.id),
    ]).then(([p, c]) => {
      setProjects(p.data);
      setContracts(c.data);
      setLoading(false);
    });
  }, [profile.id]);

  useEffect(load, [load]);

  const contractFor = (projectId: string) =>
    contracts
      .filter((c) => c.project_id === projectId)
      .sort(
        (a, b) =>
          (CONTRACT_RANK[a.status] ?? 9) - (CONTRACT_RANK[b.status] ?? 9)
      )[0];

  const isOngoing = (p: Project) => ONGOING.includes(p.status);
  const filtered = projects.filter((p) =>
    tab === "ongoing" ? isOngoing(p) : !isOngoing(p)
  );

  const counts = {
    ongoing: projects.filter(isOngoing).length,
    completed: projects.filter((p) => !isOngoing(p)).length,
  };

  const act = async (
    fn: () => Promise<{ error: { message?: string } | null }>,
    ok: string,
    fallback: string
  ) => {
    const { error } = await fn();
    if (error) {
      toast.error(error.message || fallback);
      return;
    }
    toast.success(ok);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Client workspace"
        title="Projects"
        description="Drafts, live bidding, active contracts and finished work — all in one place."
        action={
          <Button asChild className="rounded-full bg-ink px-6 text-paper hover:bg-ink-soft">
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Post a project
            </Link>
          </Button>
        }
      />

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
        <SkeletonRows count={3} height={140} />
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((p) => {
            const contract = contractFor(p.id);
            const other = contract?.freelancer;

            // The project query loads its own milestones, so these counts
            // are real here — the contracts page was reading them off a
            // relation it never selected and always showed 0/0.
            const milestones = p.milestones || [];
            const live = milestones.filter((m) => m.status !== "cancelled");
            const paid = live.filter((m) => m.status === "paid");
            const totalValue = live.reduce((s, m) => s + m.amount, 0);
            const paidValue = paid.reduce((s, m) => s + m.amount, 0);
            const pct = totalValue ? Math.round((paidValue / totalValue) * 100) : 0;
            const next = live.find((m) => m.status !== "paid");

            const isDraft = p.status === "draft";
            const isOpen = p.status === "open";

            return (
              <article
                key={p.id}
                className="rounded-xl border border-border bg-white p-5 md:p-6"
              >
                {/* Status tags — everything that used to be a tab */}
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <ProjectStatusPill status={p.status} />
                  {contract && <ContractStatusPill status={contract.status} />}
                  {contract?.status === "active" && next && (
                    <MilestoneStatusPill status={next.status} />
                  )}
                </div>

                <h3 className="font-display mb-2 text-xl font-semibold leading-snug">
                  {isDraft ? (
                    p.title
                  ) : (
                    <Link href={`/projects/${p.id}`} className="hover:text-brand">
                      {p.title}
                    </Link>
                  )}
                </h3>

                {/* Fact tags */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Tag icon={Wallet}>
                    {formatPrice(contract?.agreed_amount ?? p.budget_total)}
                    {contract ? " agreed" : ""}
                  </Tag>

                  {!isDraft && (
                    <Tag icon={Users}>
                      {p.bids_count} bid{p.bids_count === 1 ? "" : "s"}
                    </Tag>
                  )}

                  {milestones.length > 0 && (
                    <Tag icon={ListChecks}>
                      {paid.length}/{live.length} milestones paid
                    </Tag>
                  )}

                  <Tag icon={Clock}>
                    {p.published_at ? `Posted ${timeAgo(p.published_at)}` : "Not published"}
                  </Tag>

                  {other && (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-secondary/50 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-muted-foreground">
                      <UserAvatar
                        name={displayName(other)}
                        src={other.avatar_url}
                        size={20}
                      />
                      {displayName(other)}
                    </span>
                  )}
                </div>

                {/* Milestone progress, once there is a contract to track */}
                {contract && live.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate pr-3">
                        {next ? `Next: ${next.title}` : "All milestones settled"}
                      </span>
                      <span className="shrink-0">{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {isDraft ? (
                    <>
                      <Button
                        size="sm"
                        className="rounded-full bg-ink text-paper hover:bg-ink-soft"
                        onClick={() =>
                          act(
                            () => publishProject(p.id),
                            "Project published",
                            "Could not publish — add a budget first"
                          )
                        }
                      >
                        Publish
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full text-muted-foreground hover:text-red-600"
                        onClick={() =>
                          act(
                            () => deleteDraft(p.id),
                            "Draft deleted",
                            "Could not delete this draft"
                          )
                        }
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                      </Button>
                    </>
                  ) : (
                    <>
                      {contract && (
                        <Button
                          asChild
                          size="sm"
                          className="rounded-full bg-ink text-paper hover:bg-ink-soft"
                        >
                          <Link href={`/contracts/${contract.id}`}>
                            <FileSignature className="mr-1.5 h-3.5 w-3.5" />
                            {contract.status === "pending_acceptance"
                              ? "Review contract"
                              : "Open contract"}
                          </Link>
                        </Button>
                      )}

                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <Link href={`/projects/${p.id}`}>
                          {isOpen && p.bids_count > 0 ? (
                            <>
                              <Users className="mr-1.5 h-3.5 w-3.5" /> Review{" "}
                              {p.bids_count} bid{p.bids_count === 1 ? "" : "s"}
                            </>
                          ) : (
                            <>
                              View project
                              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                            </>
                          )}
                        </Link>
                      </Button>

                      {isOpen && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full text-muted-foreground hover:text-red-600"
                          onClick={() =>
                            act(
                              () => cancelProject(p.id),
                              "Project cancelled",
                              "Could not cancel this project"
                            )
                          }
                        >
                          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyCard
          icon={tab === "ongoing" ? Briefcase : FileSignature}
          title={tab === "ongoing" ? "Nothing in progress" : "Nothing finished yet"}
          description={
            tab === "ongoing"
              ? "Post a project with clear milestones and freelancers will start bidding within hours."
              : "Projects you complete or cancel are kept here, with their contracts and payment history."
          }
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
