"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Wallet,
  FileSignature,
  PlusCircle,
  ArrowUpRight,
  AlertTriangle,
  Clock,
} from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  StatTile,
  EmptyCard,
  SkeletonRows,
} from "@/components/shared/dashboard-ui";
import { CompletenessMeter } from "@/components/shared/completeness-meter";
import {
  ProjectStatusPill,
  ContractStatusPill,
  UserAvatar,
} from "@/components/shared/marketplace-ui";
import { getClientProjects } from "@/lib/services/projects";
import { getMyContracts, getMyTransactions } from "@/lib/services/contracts";
import { Contract, Profile, Project, Transaction } from "@/types/marketplace";
import { formatPrice, timeAgo, displayName } from "@/lib/utils";

function Dashboard({ profile }: { profile: Profile }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getClientProjects(profile.id),
      getMyContracts(profile.id),
      getMyTransactions(profile.id),
    ]).then(([p, c, t]) => {
      setProjects(p.data);
      setContracts(c.data);
      setTransactions(t.data);
      setLoading(false);
    });
  }, [profile.id]);

  const open = projects.filter((p) => p.status === "open");
  const drafts = projects.filter((p) => p.status === "draft");
  // Pre-award only. Once awarded, a project is represented by its contract,
  // so the two dashboard cards never show the same thing twice.
  const hiringProjects = projects.filter((p) =>
    ["draft", "open"].includes(p.status)
  );
  const activeContracts = contracts.filter((c) => c.status === "active");
  const pendingAcceptance = contracts.filter((c) => c.status === "pending_acceptance");
  const totalBids = open.reduce((s, p) => s + p.bids_count, 0);
  const spent = transactions
    .filter((t) => t.type === "escrow_fund" && t.status === "completed")
    .reduce((s, t) => s + t.amount, 0);
  const refunded = transactions
    .filter((t) => t.type === "refund" && t.status === "completed")
    .reduce((s, t) => s + t.amount, 0);

  // Milestones waiting on this client's review across all active contracts
  const awaitingReview = activeContracts.filter((c) =>
    (c.project?.milestones || []).some((m) => m.status === "submitted")
  );


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
        eyebrow="Client workspace"
        title={
          profile.full_name ? `Welcome back, ${profile.full_name.split(" ")[0]}` : "Welcome back"
        }
        description="Your projects, bids, and milestone approvals in one place."
        action={
          <Button asChild className="rounded-full bg-ink px-6 text-paper hover:bg-ink-soft">
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Post a project
            </Link>
          </Button>
        }
      />

      <CompletenessMeter profile={profile} className="mb-8" />

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Open projects"
          value={open.length}
          icon={Briefcase}
          hint={drafts.length ? `${drafts.length} draft${drafts.length === 1 ? "" : "s"}` : undefined}
          href="/client/projects"
        />
        <StatTile label="Bids received" value={totalBids} icon={Users} href="/client/projects" />
        <StatTile
          label="Active contracts"
          value={activeContracts.length}
          icon={FileSignature}
          href="/client/contracts"
        />
        <StatTile
          label="Total spent"
          value={formatPrice(spent - refunded)}
          icon={Wallet}
          hint="Escrow funded, net of refunds"
          href="/client/payments"
        />
      </div>

      {/* Needs attention */}
      {(awaitingReview.length > 0 || pendingAcceptance.length > 0) && (
        <section className="mb-8 rounded-xl border border-brand/30 bg-brand-soft p-6">
          <h2 className="font-display mb-4 text-xl font-semibold">Needs your attention</h2>
          <ul className="space-y-2.5">
            {awaitingReview.map((c) => {
              const m = (c.project?.milestones || []).find((x) => x.status === "submitted");
              return (
                <li key={c.id}>
                  <Link
                    href={`/contracts/${c.id}`}
                    className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3 transition-colors hover:bg-white/70"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        Review “{m?.title}”
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.project?.title}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-sm font-semibold">
                      {m ? formatPrice(m.amount) : ""}
                      <ArrowUpRight className="h-4 w-4 text-brand" />
                    </span>
                  </Link>
                </li>
              );
            })}
            {pendingAcceptance.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/contracts/${c.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3 transition-colors hover:bg-white/70"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      Awaiting freelancer confirmation
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.project?.title}
                    </span>
                  </span>
                  <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Still hiring — drafts and projects collecting bids. Awarded work
            lives in Contracts, so a project never appears in both cards. */}
        <section className="rounded-xl border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-xl font-semibold">Still hiring</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Drafts and projects collecting bids
              </p>
            </div>
            <Link
              href="/client/projects"
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:text-brand-deep"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {hiringProjects.length > 0 ? (
            <ul className="divide-y divide-border">
              {hiringProjects.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link
                    href={p.status === "draft" ? "/client/projects" : `/projects/${p.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-secondary"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(p.budget_total)} · {p.bids_count} bid
                        {p.bids_count === 1 ? "" : "s"}
                        {p.published_at && ` · ${timeAgo(p.published_at)}`}
                      </p>
                    </div>
                    <ProjectStatusPill status={p.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6">
              <EmptyCard
                icon={Briefcase}
                title={
                  projects.length > 0
                    ? "Every project is awarded"
                    : "No projects yet"
                }
                description={
                  projects.length > 0
                    ? "Nothing is waiting on bids right now — your active work is tracked under Contracts."
                    : "Post your first project with clear milestones and start receiving bids within hours."
                }
                actionLabel="Post a project"
                actionHref="/projects/new"
              />
            </div>
          )}
        </section>

        {/* Awarded work — the same project never appears in "Still hiring". */}
        <section className="rounded-xl border border-border bg-white">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-xl font-semibold">Awarded work</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Contracts with a freelancer engaged
              </p>
            </div>
            <Link
              href="/client/contracts"
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:text-brand-deep"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {contracts.length > 0 ? (
            <ul className="divide-y divide-border">
              {contracts.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contracts/${c.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-secondary"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        name={displayName(c.freelancer)}
                        src={c.freelancer?.avatar_url}
                        size={32}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.project?.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {displayName(c.freelancer)} · {formatPrice(c.agreed_amount)}
                        </p>
                      </div>
                    </div>
                    <ContractStatusPill status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6">
              <EmptyCard
                icon={FileSignature}
                title="No contracts yet"
                description="Once you award a project to a freelancer, the contract and its milestones appear here."
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function ClientDashboardPage() {
  return <WorkspaceShell role="client">{(profile) => <Dashboard profile={profile} />}</WorkspaceShell>;
}
