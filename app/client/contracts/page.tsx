"use client";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { ContractsList } from "@/components/shared/contracts-list";

export default function ClientContractsPage() {
  return (
    <WorkspaceShell role="client">
      {(profile) => <ContractsList profile={profile} eyebrow="Client workspace" />}
    </WorkspaceShell>
  );
}
