"use client";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { TransactionsList } from "@/components/shared/transactions-list";

export default function ClientPaymentsPage() {
  return (
    <WorkspaceShell role="client">
      {(profile) => <TransactionsList profile={profile} />}
    </WorkspaceShell>
  );
}
