"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gavel, ArrowUpRight, Clock } from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
  StatTile,
} from "@/components/shared/dashboard-ui";
import { BidStatusPill } from "@/components/shared/marketplace-ui";
import { getMyBids } from "@/lib/services/bids";
import { Bid, Profile } from "@/types/marketplace";
import { formatPrice, timeAgo, cn } from "@/lib/utils";

const TABS = [
  { key: "live", label: "Live" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "won", label: "Won" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
] as const;

function BidsPage({ profile }: { profile: Profile }) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("live");

  useEffect(() => {
    getMyBids(profile.id).then(({ data }) => {
      setBids(data);
      setLoading(false);
    });
  }, [profile.id]);

  const filtered = bids.filter((b) => {
    if (tab === "all") return true;
    if (tab === "live") return ["submitted", "shortlisted"].includes(b.status);
    if (tab === "shortlisted") return b.status === "shortlisted";
    if (tab === "won") return b.status === "accepted";
    return ["rejected", "withdrawn"].includes(b.status);
  });

  const counts = {
    live: bids.filter((b) => ["submitted", "shortlisted"].includes(b.status)).length,
    shortlisted: bids.filter((b) => b.status === "shortlisted").length,
    won: bids.filter((b) => b.status === "accepted").length,
    closed: bids.filter((b) => ["rejected", "withdrawn"].includes(b.status)).length,
    all: bids.length,
  };

  const decided = bids.filter((b) => ["accepted", "rejected"].includes(b.status)).length;
  const winRate = decided ? Math.round((counts.won / decided) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Freelancer workspace"
        title="My bids"
        description="Every proposal you've submitted and where it stands."
      />

      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatTile label="Live bids" value={counts.live} icon={Gavel} />
        <StatTile label="Won" value={counts.won} icon={ArrowUpRight} />
        <StatTile
          label="Win rate"
          value={decided ? `${winRate}%` : "—"}
          icon={Clock}
          hint={decided ? `${decided} decided` : "No decisions yet"}
        />
      </div>

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
        <SkeletonRows count={3} height={110} />
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((b) => {
            const project = (b as any).project;
            return (
              <Link
                key={b.id}
                href={`/projects/${b.project_id}`}
                className="card-lift block rounded-xl border border-border bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2.5">
                      <BidStatusPill status={b.status} />
                      <span className="text-xs text-muted-foreground">
                        Bid {timeAgo(b.created_at)}
                      </span>
                    </div>
                    <h3 className="font-display mb-1 text-lg font-semibold leading-snug">
                      {project?.title || "Project"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Client budget {formatPrice(project?.budget_total || 0)}
                      {project?.bids_count != null &&
                        ` · ${project.bids_count} bid${project.bids_count === 1 ? "" : "s"} total`}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-display text-xl font-semibold leading-none">
                      {formatPrice(b.amount)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {b.delivery_days} days delivery
                    </p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 border-t border-border pt-3 text-sm text-muted-foreground">
                  {b.proposal}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyCard
          icon={Gavel}
          title={`No ${tab === "all" ? "" : tab} bids`}
          description="Browse open projects and submit a proposal. Projects with fewer bids give you the best odds."
          actionLabel="Find work"
          actionHref="/projects"
        />
      )}
    </div>
  );
}

export default function FreelancerBidsPage() {
  return (
    <WorkspaceShell role="freelancer">{(profile) => <BidsPage profile={profile} />}</WorkspaceShell>
  );
}
