"use client";

import { useEffect, useState } from "react";
import { Users, Briefcase, FileSignature, Wallet, ShieldAlert } from "lucide-react";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { PageHeader, StatTile, SkeletonRows } from "@/components/shared/dashboard-ui";
import { getPlatformStats } from "@/lib/services/admin";
import { formatPrice } from "@/lib/utils";

function AdminOverview() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getPlatformStats>> | null>(null);

  useEffect(() => {
    getPlatformStats().then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="mx-auto max-w-5xl">
        <SkeletonRows count={2} height={120} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow="Admin"
        title="Platform overview"
        description="Health of the marketplace at a glance."
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatTile label="Users" value={stats.users} icon={Users} href="/admin/users" />
        <StatTile label="Projects posted" value={stats.projects} icon={Briefcase} />
        <StatTile label="Contracts" value={stats.contracts} icon={FileSignature} />
        <StatTile
          label="Volume released"
          value={formatPrice(stats.volumeReleased)}
          icon={Wallet}
          hint="Paid out from escrow"
        />
        <StatTile
          label="Open disputes"
          value={stats.openDisputes}
          icon={ShieldAlert}
          href="/admin/disputes"
        />
      </div>

      <div className="rounded-xl border border-border bg-white p-6 text-sm leading-relaxed text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">Moderation notes</p>
        Admin actions are enforced database-side: only accounts with the{" "}
        <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">admin</code>{" "}
        role can resolve disputes, verify users, or suspend accounts. Regular
        users cannot self-assign this role.
      </div>
    </div>
  );
}

export default function AdminPage() {
  return <WorkspaceShell role="admin">{() => <AdminOverview />}</WorkspaceShell>;
}
