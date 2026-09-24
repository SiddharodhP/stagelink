"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Gavel, Pencil, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  inputClass,
  textareaClass,
  blurOnWheel,
} from "@/components/shared/dashboard-ui";
import { BidStatusPill } from "@/components/shared/marketplace-ui";
import { submitBid, reviseBid, withdrawBid } from "@/lib/services/bids";
import { Bid, Profile, Project } from "@/types/marketplace";
import { formatPrice } from "@/lib/utils";

/**
 * Freelancer-side bidding box on the project page.
 * Handles first submission, editing a live bid, and withdrawal.
 */
export function BidPanel({
  project,
  profile,
  existingBid,
  onChange,
}: {
  project: Project;
  profile: Profile;
  existingBid: Bid | null;
  onChange: (bid: Bid | null) => void;
}) {
  const [editing, setEditing] = useState(!existingBid);
  const [isSaving, setIsSaving] = useState(false);
  const [amount, setAmount] = useState(
    existingBid ? String(existingBid.amount) : String(project.budget_total || "")
  );
  const [days, setDays] = useState(existingBid ? String(existingBid.delivery_days) : "");
  // One box now, so prefer the public copy and fall back to the private
  // one for bids placed when they were separate fields.
  const [proposal, setProposal] = useState(
    existingBid?.public_note || existingBid?.proposal || ""
  );

  const isLive = existingBid && ["submitted", "shortlisted"].includes(existingBid.status);
  const canBid = project.status === "open";

  const save = async () => {
    if (!Number(amount) || Number(amount) <= 0) return toast.error("Enter your bid amount");
    if (!Number(days) || Number(days) <= 0) return toast.error("Enter your delivery time in days");
    if (!proposal.trim()) return toast.error("Write a short proposal");

    setIsSaving(true);
    /**
     * The same text fills both columns. place_bid still takes a private
     * proposal and a public note and rejects an empty one of either, and
     * project_comments is written from public_note -- so sending one string
     * to both keeps the public thread working without a migration.
     *
     * It does mean the proposal is now public. That is the trade for one
     * box instead of two: the price and delivery time stay private, the
     * words do not.
     */
    const text = proposal.trim();
    const payload = {
      amount: Number(amount),
      delivery_days: Number(days),
      proposal: text,
      public_note: text,
    };

    const { error } = existingBid
      ? await reviseBid(existingBid.id, payload)
      : await submitBid({ project_id: project.id, ...payload });

    setIsSaving(false);
    if (error) {
      toast.error(error.message || "Could not submit your bid");
      return;
    }
    toast.success(
      existingBid ? "Bid updated" : "Bid submitted — the client has been notified"
    );
    // The bid and its comment are written server-side, so refetch rather
    // than reconstructing the row here and risking a stale view.
    onChange(null);
    setEditing(false);
  };

  const withdraw = async () => {
    if (!existingBid) return;
    setIsSaving(true);
    const { error } = await withdrawBid(existingBid.id);
    setIsSaving(false);
    if (error) return toast.error(error.message || "Could not withdraw");
    toast.success("Bid withdrawn");
    onChange(null);
  };

  if (!canBid) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="font-display mb-1 text-lg font-semibold">Bidding closed</p>
        <p className="text-sm text-muted-foreground">
          This project is no longer accepting bids.
        </p>
      </div>
    );
  }

  if (profile.role !== "freelancer") {
    return null;
  }

  /* Existing bid, not editing → summary card */
  if (existingBid && !editing) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Your bid</h2>
          <BidStatusPill status={existingBid.status} />
        </div>

        <dl className="mb-5 space-y-3 border-b border-border pb-5">
          <div className="flex items-baseline justify-between">
            <dt className="text-sm text-muted-foreground">Your price</dt>
            <dd className="font-display text-2xl font-semibold">
              {formatPrice(existingBid.amount)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-sm text-muted-foreground">Delivery</dt>
            <dd className="font-medium">{existingBid.delivery_days} days</dd>
          </div>
        </dl>

        <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
          {existingBid.proposal}
        </p>

        {existingBid.status === "accepted" ? (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 p-4 text-sm text-emerald-900 dark:text-emerald-300">
            <p className="mb-2 font-semibold">You won this project.</p>
            <Link href="/freelancer/work" className="font-medium underline">
              Review the milestones and confirm →
            </Link>
          </div>
        ) : existingBid.status === "rejected" ? (
          <p className="text-sm text-muted-foreground">
            The client selected another freelancer for this project.
          </p>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setEditing(true)}
              disabled={isSaving}
            >
              <Pencil className="mr-2 h-4 w-4" />
              {existingBid.status === "withdrawn" ? "Re-bid" : "Edit bid"}
            </Button>
            {isLive && (
              <Button
                variant="ghost"
                className="rounded-full text-muted-foreground"
                onClick={withdraw}
                disabled={isSaving}
              >
                <Undo2 className="mr-2 h-4 w-4" /> Withdraw
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  /* Bid form */
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-display mb-1 text-xl font-semibold">
        {existingBid ? "Update your bid" : "Place your bid"}
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Client budget:{" "}
        <strong className="text-foreground">{formatPrice(project.budget_total)}</strong>
        {". "}
        Milestones are agreed with the client after they pick someone.
      </p>

      <div className="space-y-4">
        <Field label="Your total price ($)" required hint="You can bid above or below the client's budget.">
          <input
            type="number"
            onWheel={blurOnWheel}
            min="1"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <Field label="Delivery time (days)" required>
          <input
            type="number"
            onWheel={blurOnWheel}
            min="1"
            className={inputClass}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="e.g. 21"
          />
        </Field>

        <Field
          label="Your proposal"
          required
          hint="Posted on the project for everyone to read, including other freelancers. Your price and delivery time stay private."
        >
          <textarea
            className={textareaClass}
            maxLength={1000}
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            placeholder="How you'd approach it, what you've shot before, and why you're a good fit…"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {proposal.trim().length}/1000
          </p>
        </Field>
      </div>

      <div className="mt-5 flex gap-2">
        <Button
          className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={save}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Gavel className="mr-2 h-4 w-4" />
          )}
          {existingBid ? "Update bid" : "Submit bid"}
        </Button>
        {existingBid && (
          <Button variant="ghost" className="rounded-full" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
