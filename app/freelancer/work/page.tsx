"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Gavel,
  ArrowUpRight,
  Clock,
  FileSignature,
  Wallet,
  ListChecks,
  Users,
  Search,
} from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
  StatTile,
} from "@/components/shared/dashboard-ui";
import {
  BidStatusPill,
  ContractStatusPill,
  MilestoneStatusPill,
  UserAvatar,
} from "@/components/shared/marketplace-ui";
import { getMyBids } from "@/lib/services/bids";
import { getMyContracts } from "@/lib/services/contracts";
import { Bid, Contract, Profile } from "@/types/marketplace";
import { formatPrice, timeAgo, cn, displayName, partyName } from "@/lib/utils";

/**
 * One list for everything the freelancer is chasing or doing.
 *
 * "My bids" and "Contracts" were two sidebar entries and nine tabs between
 * them, for what is one thing at two stages: a job you are trying to win,
 * and the same job once you have won it. A bid that gets accepted did not
 * move somewhere else, it changed state -- so it stays on the same row and
 * the tags change.
 *
 * Mirrors the client side, where projects and contracts merged for exactly
 * the same reason.
 */

const TABS = [
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** Neutral fact — money, counts, timing. */
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

const LIVE_BID = ["submitted", "shortlisted"];
const LIVE_CONTRACT = ["pending_acceptance", "active"];

function WorkPage({ profile }: { profile: Profile }) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("ongoing");

  const load = useCallback(() => {
    Promise.all([getMyBids(profile.id), getMyContracts(profile.id)]).then(
      ([b, c]) => {
        setBids(b.data);
        setContracts(c.data);
        setLoading(false);
      }
    );
  }, [profile.id]);

  useEffect(load, [load]);

  /**
   * A won bid and its contract are the same row. Match on bid_id, which the
   * contract carries, so an accepted bid never renders twice.
   */
  const contractByBid = new Map(
    contracts.filter((c) => c.bid_id).map((c) => [c.bid_id as string, c])
  );
  const claimed = new Set(contractByBid.keys());

  type Row =
    | { kind: "contract"; at: string; contract: Contract; bid?: Bid }
    | { kind: "bid"; at: string; bid: Bid };

  const rows: Row[] = [
    ...contracts.map((c) => ({
      kind: "contract" as const,
      at: c.created_at,
      contract: c,
      bid: bids.find((b) => b.id === c.bid_id),
    })),
    ...bids
      .filter((b) => !claimed.has(b.id))
      .map((b) => ({ kind: "bid" as const, at: b.created_at, bid: b })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const isOngoing = (r: Row) =>
    r.kind === "contract"
      ? LIVE_CONTRACT.includes(r.contract.status)
      : LIVE_BID.includes(r.bid.status);

  const filtered = rows.filter((r) =>
    tab === "ongoing" ? isOngoing(r) : !isOngoing(r)
  );

  const counts = {
    ongoing: rows.filter(isOngoing).length,
    completed: rows.filter((r) => !isOngoing(r)).length,
  };

  const liveBids = bids.filter((b) => LIVE_BID.includes(b.status)).length;
  const won = bids.filter((b) => b.status === "accepted").length;
  const decided = bids.filter((b) =>
    ["accepted", "rejected"].includes(b.status)
  ).length;
  const winRate = decided ? Math.round((won / decided) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Freelancer workspace"
        title="My work"
        description="Bids you've sent and contracts you're delivering, in one place."
        action={
          <Button asChild className="rounded-full bg-ink px-6 text-paper hover:bg-ink-soft">
            <Link href="/projects">
              <Search className="mr-2 h-4 w-4" /> Find work
            </Link>
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-3 gap-4">
        <StatTile label="Live bids" value={liveBids} icon={Gavel} />
        <StatTile label="Won" value={won} icon={ArrowUpRight} />
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
        <SkeletonRows count={3} height={140} />
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((r) => {
            /* ---------------- Won: a contract ---------------- */
            if (r.kind === "contract") {
              const c = r.contract;
              const client = c.client;
              const milestones = c.project?.milestones || [];
              const live = milestones.filter((m) => m.status !== "cancelled");
              const paid = live.filter((m) => m.status === "paid");
              const total = live.reduce((s, m) => s + m.amount, 0);
              const paidValue = paid.reduce((s, m) => s + m.amount, 0);
              const pct = total ? Math.round((paidValue / total) * 100) : 0;
              const next = live.find((m) => m.status !== "paid");
              const planSent = Boolean(c.plan_sent_at);

              return (
                <article
                  key={c.id}
                  className="rounded-xl border border-border bg-white p-5 md:p-6"
                >
                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <ContractStatusPill status={c.status} planSent={planSent} />
                    {c.status === "active" && next && (
                      <MilestoneStatusPill status={next.status} />
                    )}
                  </div>

                  <h3 className="font-display mb-2 text-xl font-semibold leading-snug">
                    <Link
                      href={`/projects/${c.project_id}`}
                      className="hover:text-brand"
                    >
                      {c.project?.title || "Project"}
                    </Link>
                  </h3>

                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Tag icon={Wallet}>{formatPrice(c.agreed_amount)} agreed</Tag>
                    {live.length > 0 && (
                      <Tag icon={ListChecks}>
                        {paid.length}/{live.length} milestones paid
                      </Tag>
                    )}
                    <Tag icon={Clock}>Awarded {timeAgo(c.created_at)}</Tag>
                    {client && (
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-secondary/50 py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-muted-foreground">
                        <UserAvatar
                          name={displayName(client)}
                          src={client.avatar_url}
                          size={20}
                        />
                        {partyName(client)}
                      </span>
                    )}
                  </div>

                  {live.length > 0 && (
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

                  <div className="flex flex-wrap gap-2">
                    <Button
                      asChild
                      size="sm"
                      className="rounded-full bg-ink text-paper hover:bg-ink-soft"
                    >
                      <Link href={`/contracts/${c.id}`}>
                        <FileSignature className="mr-1.5 h-3.5 w-3.5" />
                        {c.status === "pending_acceptance" && planSent
                          ? "Review the plan"
                          : "Open contract"}
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="rounded-full">
                      <Link href={`/projects/${c.project_id}`}>
                        View project
                        <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            }

            /* ---------------- Still a bid ---------------- */
            const b = r.bid;
            const project = (b as any).project;

            return (
              <article
                key={b.id}
                className="rounded-xl border border-border bg-white p-5 md:p-6"
              >
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <BidStatusPill status={b.status} />
                </div>

                <h3 className="font-display mb-2 text-xl font-semibold leading-snug">
                  <Link href={`/projects/${b.project_id}`} className="hover:text-brand">
                    {project?.title || "Project"}
                  </Link>
                </h3>

                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Tag icon={Wallet}>{formatPrice(b.amount)} your bid</Tag>
                  <Tag icon={Clock}>{b.delivery_days} days delivery</Tag>
                  {project?.bids_count != null && (
                    <Tag icon={Users}>
                      {project.bids_count} bid{project.bids_count === 1 ? "" : "s"} total
                    </Tag>
                  )}
                  <Tag icon={Clock}>Bid {timeAgo(b.created_at)}</Tag>
                </div>

                {b.proposal && (
                  <p className="mb-4 line-clamp-2 border-t border-border pt-3 text-sm text-muted-foreground">
                    {b.proposal}
                  </p>
                )}

                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link href={`/projects/${b.project_id}`}>
                    View project
                    <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyCard
          icon={tab === "ongoing" ? Gavel : FileSignature}
          title={tab === "ongoing" ? "Nothing in progress" : "Nothing finished yet"}
          description={
            tab === "ongoing"
              ? "Browse open projects and send a proposal. Projects with fewer bids give you the best odds."
              : "Bids that did not land and contracts you have delivered are kept here."
          }
          actionLabel="Find work"
          actionHref="/projects"
        />
      )}
    </div>
  );
}

export default function FreelancerWorkPage() {
  return (
    <WorkspaceShell role="freelancer">
      {(profile) => <WorkPage profile={profile} />}
    </WorkspaceShell>
  );
}
