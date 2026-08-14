"use client";

import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { ContractsList } from "@/components/shared/contracts-list";

export default function FreelancerContractsPage() {
  return (
    <WorkspaceShell role="freelancer">
      {(profile) => <ContractsList profile={profile} eyebrow="Freelancer workspace" />}
    </WorkspaceShell>
  );
}
