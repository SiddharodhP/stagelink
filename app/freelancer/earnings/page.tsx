"use client";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { TransactionsList } from "@/components/shared/transactions-list";

export default function FreelancerEarningsPage() {
  return (
    <WorkspaceShell role="freelancer">
      {(profile) => <TransactionsList profile={profile} />}
    </WorkspaceShell>
  );
}
