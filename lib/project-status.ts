import type { Contract, Milestone } from "@/types/marketplace";

/**
 * Where a project stands, in a sentence.
 *
 * This used to live inline in the contract page. Messages needs the same
 * answer, and two copies of "whose move is it" would drift the moment one of
 * them gained a case -- which is exactly how both sides once ended up being
 * told they were waiting for the other.
 *
 * Phrased from the viewer's side, so `you` and `them` are always resolved
 * before the string is built. The caller never has to re-word anything.
 */

export type ProjectStage = {
  /** Who has to act next. `none` when nothing is pending. */
  who: "you" | "them" | "none";
  /** Short label, for a badge or a button. */
  label: string;
  /** A complete sentence. */
  text: string;
};

/** Milestones still in play, in sequence order. */
function liveMilestones(milestones: Milestone[]) {
  return milestones.filter((m) => !["paid", "cancelled"].includes(m.status));
}

export function milestoneProgress(milestones: Milestone[]) {
  const counted = milestones.filter((m) => m.status !== "cancelled");
  const paid = counted.filter((m) => m.status === "paid").length;
  return { paid, total: counted.length };
}

export function projectStatus({
  contract,
  milestones,
  viewerIsClient,
}: {
  contract: Contract | null | undefined;
  milestones: Milestone[];
  viewerIsClient: boolean;
}): ProjectStage {
  // A conversation can start before anyone is awarded the work -- someone
  // asking a question on an open posting. That is a real state, not an error.
  if (!contract) {
    return {
      who: "none",
      label: "No contract yet",
      text: viewerIsClient
        ? "You have not awarded this project yet. Talk it through here, then award it to start a contract."
        : "This project has not been awarded yet. Ask anything you need to before you bid.",
    };
  }

  if (contract.status === "completed") {
    const { total } = milestoneProgress(milestones);
    return {
      who: "none",
      label: "Complete",
      // "All 2 milestones" is the kind of phrase only a template writes.
      text:
        total === 0
          ? "This project is finished and fully paid."
          : total === 1
            ? "This project is finished. The milestone was delivered, approved and paid."
            : total === 2
              ? "This project is finished. Both milestones were delivered, approved and paid."
              : `This project is finished. All ${total} milestones were delivered, approved and paid.`,
    };
  }

  if (contract.status === "cancelled") {
    return {
      who: "none",
      label: "Cancelled",
      text: "This contract was cancelled. Any milestone that was funded but not approved is refunded to the client.",
    };
  }

  if (contract.status === "declined") {
    return {
      who: "none",
      label: "Declined",
      text: viewerIsClient
        ? "The freelancer declined this contract, so no work is scheduled."
        : "You declined this contract, so no work is scheduled.",
    };
  }

  if (contract.status === "pending_acceptance") {
    // Before the plan is sent the ball is in the client's court: there is
    // nothing yet for the freelancer to confirm.
    if (!contract.plan_sent_at) {
      return viewerIsClient
        ? {
            who: "you",
            label: "Planning milestones",
            text: "You are still setting up the milestones. Break the work into stages, set a price for each, and send the plan to the freelancer.",
          }
        : {
            who: "them",
            label: "Planning milestones",
            text: "The client is still breaking the work into milestones. Once they send the plan you will be asked to confirm it before anything starts.",
          };
    }
    return viewerIsClient
      ? {
          who: "them",
          label: "Awaiting confirmation",
          text: "You have sent the milestone plan. The freelancer is reviewing it, and work starts once they confirm.",
        }
      : {
          who: "you",
          label: "Awaiting your confirmation",
          text: "The client has sent a milestone plan. Review the stages and prices, and confirm to start work.",
        };
  }

  const active = liveMilestones(milestones)[0];
  const { paid, total } = milestoneProgress(milestones);
  // Position reads from the whole plan, not from what is left, so the
  // sentence still makes sense once earlier milestones are paid off.
  const position = total > 0 ? `Milestone ${paid + 1} of ${total}` : "";

  if (!active) {
    return {
      who: "none",
      label: "In progress",
      text: "The contract is active. No milestone is currently open.",
    };
  }

  const name = `“${active.title}”`;
  const prefix = position ? `${position}, ${name}, ` : `${name} `;

  switch (active.status) {
    case "pending":
      return viewerIsClient
        ? {
            who: "you",
            label: "Awaiting funding",
            text: `${prefix}is agreed but not funded. Fund it to let work begin — the money is held in escrow until you approve the delivery.`,
          }
        : {
            who: "them",
            label: "Awaiting funding",
            text: `${prefix}is agreed. Work starts once the client funds it into escrow.`,
          };

    case "in_progress":
      return viewerIsClient
        ? {
            who: "them",
            label: "Work in progress",
            text: `${prefix}is funded and the freelancer is working on it now.`,
          }
        : {
            who: "you",
            label: "Work in progress",
            text: `${prefix}is funded and yours to deliver. Submit it for review when it is ready.`,
          };

    case "revision_requested":
      return viewerIsClient
        ? {
            who: "them",
            label: "Revision requested",
            text: `You asked for changes to ${name}. The freelancer is working on the revision.`,
          }
        : {
            who: "you",
            label: "Revision requested",
            text: `The client has asked for changes to ${name}. Make the revision and submit it again.`,
          };

    case "submitted":
      return viewerIsClient
        ? {
            who: "you",
            label: "Awaiting your review",
            text: `${prefix}has been delivered and is waiting on you. Approve it to release the payment, or ask for a revision.`,
          }
        : {
            who: "them",
            label: "In review",
            text: `${prefix}has been delivered. The client is reviewing it, and payment is released when they approve.`,
          };

    case "approved":
      return {
        who: "none",
        label: "Releasing payment",
        text: `${prefix}has been approved and the payment is being released.`,
      };

    case "disputed":
      return {
        who: "none",
        label: "In dispute",
        text: `${name} is under dispute review. Our team will look at both sides and decide how the escrowed money is settled.`,
      };

    default:
      return {
        who: "none",
        label: "In progress",
        text: `${prefix}is the current stage of this project.`,
      };
  }
}
