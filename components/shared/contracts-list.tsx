"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSignature } from "lucide-react";

import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
} from "@/components/shared/dashboard-ui";
import {
  ContractStatusPill,
  MilestoneStatusPill,
  UserAvatar,
  NameWithBadge,
} from "@/components/shared/marketplace-ui";
import { getMyContracts } from "@/lib/services/contracts";
import { Contract, Profile } from "@/types/marketplace";
import { formatPrice, cn, displayName, partyName } from "@/lib/utils";

const TABS = [
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
] as const;

export function ContractsList({
  profile,
  eyebrow,
}: {
  profile: Profile;
  eyebrow: string;
}) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("active");

  const isClient = profile.role === "client";

  useEffect(() => {
    getMyContracts(profile.id).then(({ data }) => {
      setContracts(data);
      setLoading(false);
    });
  }, [profile.id]);

  const filtered = contracts.filter((c) => {
    if (tab === "all") return true;
    if (tab === "active") return c.status === "active";
    if (tab === "pending") return c.status === "pending_acceptance";
    return ["completed", "cancelled", "declined"].includes(c.status);
  });

  const counts = {
    active: contracts.filter((c) => c.status === "active").length,
    pending: contracts.filter((c) => c.status === "pending_acceptance").length,
    completed: contracts.filter((c) =>
      ["completed", "cancelled", "declined"].includes(c.status)
    ).length,
    all: contracts.length,
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow={eyebrow}
        title="Contracts"
        description={
          isClient
            ? "Awarded projects and their milestone progress."
            : "Work you've been awarded, and what's due next."
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
        <SkeletonRows count={3} height={120} />
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((c) => {
            const other = isClient ? c.freelancer : c.client;
            const milestones = c.project?.milestones || [];
            const paid = milestones.filter((m) => m.status === "paid");
            const totalValue = milestones
              .filter((m) => m.status !== "cancelled")
              .reduce((s, m) => s + m.amount, 0);
            const paidValue = paid.reduce((s, m) => s + m.amount, 0);
            const pct = totalValue ? Math.round((paidValue / totalValue) * 100) : 0;
            const active = milestones.find((m) => !["paid", "cancelled"].includes(m.status));

            return (
              <Link
                key={c.id}
                href={`/contracts/${c.id}`}
                className="card-lift block rounded-xl border border-border bg-white p-5 md:p-6"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2.5">
                      <ContractStatusPill
                        status={c.status}
                        planSent={Boolean(c.plan_sent_at)}
                      />
                      {active && c.status === "active" && (
                        <MilestoneStatusPill status={active.status} />
                      )}
                    </div>
                    <h3 className="font-display mb-1.5 text-xl font-semibold leading-snug">
                      {c.project?.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        name={displayName(other)}
                        src={other?.avatar_url}
                        size={22}
                      />
                      <span className="text-sm text-muted-foreground">
                        <NameWithBadge
                          name={partyName(other)}
                          verified={other?.is_verified}
                        />
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-display text-2xl font-semibold leading-none">
                      {formatPrice(c.agreed_amount)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {paid.length}/{milestones.length} milestones paid
                    </p>
                  </div>
                </div>

                {milestones.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {active ? `Next: ${active.title}` : "All milestones settled"}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-brand transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyCard
          icon={FileSignature}
          title={`No ${tab === "all" ? "" : tab} contracts`}
          description={
            isClient
              ? "Award a project to a freelancer and the contract will appear here with its milestone timeline."
              : "Win a bid and your contract will appear here — you'll confirm the milestones before work starts."
          }
          actionLabel={isClient ? "Post a project" : "Find work"}
          actionHref={isClient ? "/projects/new" : "/projects"}
        />
      )}
    </div>
  );
}
