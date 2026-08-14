"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Gavel,
  Wallet,
  FileSignature,
  Compass,
  ArrowUpRight,
  AlertTriangle,
  Star,
  Upload,
  CheckCircle2,
} from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  StatTile,
  EmptyCard,
  SkeletonRows,
} from "@/components/shared/dashboard-ui";
import {
  BidStatusPill,
} from "@/components/shared/marketplace-ui";
import { ProjectCard } from "@/components/shared/project-card";
import { getMyBids } from "@/lib/services/bids";
import { getMyContracts, getMyTransactions } from "@/lib/services/contracts";
import { searchProjects } from "@/lib/services/projects";
import { getPublicProfile } from "@/lib/services/profiles";
import { Bid, Contract, Profile, Project, Transaction } from "@/types/marketplace";
import { formatPrice, timeAgo, cn } from "@/lib/utils";

function Dashboard({ profile }: { profile: Profile }) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recommended, setRecommended] = useState<Project[]>([]);
  const [stats, setStats] = useState({ rating: 0, reviews: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMyBids(profile.id),
      getMyContracts(profile.id),
      getMyTransactions(profile.id),
      // Recommend by the freelancer's own skills; fall back to newest.
      searchProjects({
        skills: profile.skills?.length ? profile.skills : undefined,
        sortBy: "newest",
        page: 1,
      }),
      getPublicProfile(profile.id),
    ]).then(([b, c, t, r, p]) => {
      setBids(b.data);
      setContracts(c.data);
      setTransactions(t.data);
      setRecommended(r.data.slice(0, 3));
      setStats({ rating: p.data?.avg_rating || 0, reviews: p.data?.total_reviews || 0 });
      setLoading(false);
    });
  }, [profile.id, profile.skills]);

  const liveBids = bids.filter((b) => ["submitted", "shortlisted"].includes(b.status));
  const shortlisted = bids.filter((b) => b.status === "shortlisted");
  const activeContracts = contracts.filter((c) => c.status === "active");
  const pendingAcceptance = contracts.filter((c) => c.status === "pending_acceptance");
  const earned = transactions
    .filter((t) => t.type === "release" && t.payee_id === profile.id)
    .reduce((s, t) => s + t.amount, 0);

  // Milestones this freelancer needs to deliver
  const toDeliver = activeContracts.flatMap((c) =>
    (c.project?.milestones || [])
      .filter((m) => ["in_progress", "revision_requested"].includes(m.status))
      .map((m) => ({ contract: c, milestone: m }))
  );

  const checklist = [
    { done: Boolean(profile.full_name), label: "Add your name" },
    { done: Boolean(profile.headline), label: "Write a headline" },
    { done: Boolean(profile.bio), label: "Write your bio" },
    { done: (profile.skills?.length || 0) > 0, label: "Add your skills" },
    { done: Boolean(profile.avatar_url), label: "Upload a photo" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const completion = Math.round((doneCount / checklist.length) * 100);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <SkeletonRows count={4} height={100} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Freelancer workspace"
        title={
          profile.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Welcome back"
        }
        description="Your bids, active work, and what needs delivering next."
        action={
          <Button asChild className="rounded-full bg-ink px-6 text-paper hover:bg-ink-soft">
            <Link href="/projects">
              <Compass className="mr-2 h-4 w-4" /> Find work
            </Link>
          </Button>
        }
      />

      {completion < 100 && (
        <div className="mb-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-amber-100 p-2.5 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="mb-1 font-semibold">
                Your profile is {completion}% complete
              </h3>
              <p className="text-sm text-muted-foreground">
                Clients read your profile before your bid. Complete profiles win
                significantly more work.
              </p>
            </div>
          </div>
          <Button asChild className="rounded-full bg-ink text-paper hover:bg-ink-soft">
            <Link href="/settings/profile">Finish profile</Link>
          </Button>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Live bids"
          value={liveBids.length}
          icon={Gavel}
          hint={shortlisted.length ? `${shortlisted.length} shortlisted` : undefined}
          href="/freelancer/bids"
        />
        <StatTile
          label="Active contracts"
          value={activeContracts.length}
          icon={FileSignature}
          href="/freelancer/contracts"
        />
        <StatTile
          label="Total earned"
          value={formatPrice(earned)}
          icon={Wallet}
          hint="Released from escrow"
          href="/freelancer/earnings"
        />
        <StatTile
          label="Rating"
          value={stats.reviews ? stats.rating.toFixed(1) : "—"}
          icon={Star}
          hint={stats.reviews ? `${stats.reviews} review${stats.reviews === 1 ? "" : "s"}` : "No reviews yet"}
          href={`/u/${profile.id}`}
        />
      </div>

      {/* Action queue */}
      {(toDeliver.length > 0 || pendingAcceptance.length > 0) && (
        <section className="mb-8 rounded-xl border border-brand/30 bg-brand-soft p-6">
          <h2 className="font-display mb-4 text-xl font-semibold">Needs your attention</h2>
          <ul className="space-y-2.5">
            {pendingAcceptance.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/contracts/${c.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3 transition-colors hover:bg-white/70"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      Confirm the milestones to start
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.project?.title} · {formatPrice(c.agreed_amount)}
                    </span>
                  </span>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
                </Link>
              </li>
            ))}
            {toDeliver.map(({ contract, milestone }) => (
              <li key={milestone.id}>
                <Link
                  href={`/contracts/${contract.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3 transition-colors hover:bg-white/70"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {milestone.status === "revision_requested" ? "Revise" : "Deliver"} “
                      {milestone.title}”
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {contract.project?.title}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
                    {formatPrice(milestone.amount)}
                    <Upload className="h-4 w-4 text-brand" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Bids */}
        <section className="rounded-xl border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <h2 className="font-display text-xl font-semibold">Recent bids</h2>
            <Link
              href="/freelancer/bids"
              className="flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-deep"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {bids.length > 0 ? (
            <ul className="divide-y divide-border">
              {bids.slice(0, 5).map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/projects/${b.project_id}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-secondary"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {(b as any).project?.title || "Project"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(b.amount)} · {b.delivery_days} days · {timeAgo(b.created_at)}
                      </p>
                    </div>
                    <BidStatusPill status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6">
              <EmptyCard
                icon={Gavel}
                title="No bids yet"
                description="Browse open projects and submit your first proposal — projects with fewer bids are the best odds."
                actionLabel="Find work"
                actionHref="/projects"
              />
            </div>
          )}
        </section>

        {/* Profile strength */}
        <section className="rounded-xl border border-border bg-white p-6">
          <h2 className="font-display mb-1 text-xl font-semibold">Profile strength</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            The first thing a client checks after your price.
          </p>

          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-display text-3xl font-semibold">{completion}%</span>
            <span className="text-xs text-muted-foreground">
              {doneCount} of {checklist.length} complete
            </span>
          </div>
          <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>

          <ul className="space-y-3">
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                <CheckCircle2
                  className={cn("h-4 w-4", item.done ? "text-emerald-600" : "text-border")}
                />
                <span className={item.done ? "text-foreground/80" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </li>
            ))}
          </ul>

          {completion < 100 && (
            <Button asChild variant="outline" className="mt-5 w-full rounded-full">
              <Link href="/settings/profile">Complete profile</Link>
            </Button>
          )}
        </section>
      </div>

      {/* Recommended projects */}
      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Recommended for you
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.skills?.length
                ? "Matched to the skills on your profile."
                : "Add skills to your profile for better matches."}
            </p>
          </div>
          <Link
            href="/projects"
            className="flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-deep"
          >
            Browse all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recommended.length > 0 ? (
          <div className="space-y-4">
            {recommended.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <EmptyCard
            icon={Compass}
            title="No matching projects right now"
            description="New projects are posted daily. Broaden your skills list or check the full board."
            actionLabel="Browse all projects"
            actionHref="/projects"
          />
        )}
      </section>
    </div>
  );
}

export default function FreelancerDashboardPage() {
  return (
    <WorkspaceShell role="freelancer">{(profile) => <Dashboard profile={profile} />}</WorkspaceShell>
  );
}
