"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Gavel, Pencil, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, inputClass, textareaClass } from "@/components/shared/dashboard-ui";
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
  const [proposal, setProposal] = useState(existingBid?.proposal || "");
  const [publicNote, setPublicNote] = useState(existingBid?.public_note || "");

  const isLive = existingBid && ["submitted", "shortlisted"].includes(existingBid.status);
  const canBid = project.status === "open";

  const save = async () => {
    if (!Number(amount) || Number(amount) <= 0) return toast.error("Enter your bid amount");
    if (!Number(days) || Number(days) <= 0) return toast.error("Enter your delivery time in days");
    if (proposal.trim().length < 40)
      return toast.error("Write at least a few sentences explaining your approach");
    if (!publicNote.trim())
      return toast.error("Add a public note — other freelancers will see it");

    setIsSaving(true);
    const payload = {
      amount: Number(amount),
      delivery_days: Number(days),
      proposal: proposal.trim(),
      public_note: publicNote.trim(),
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
      <div className="rounded-xl border border-border bg-white p-6 text-center">
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
      <div className="rounded-xl border border-border bg-white p-6">
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
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p className="mb-2 font-semibold">You won this project.</p>
            <Link href="/freelancer/contracts" className="font-medium underline">
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
    <div className="rounded-xl border border-border bg-white p-6">
      <h2 className="font-display mb-1 text-xl font-semibold">
        {existingBid ? "Update your bid" : "Place your bid"}
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Client budget: <strong className="text-foreground">{formatPrice(project.budget_total)}</strong>{" "}
        across {project.milestones?.length ?? 0} milestones
      </p>

      <div className="space-y-4">
        <Field label="Your total price (₹)" required hint="You can bid above or below the client's budget.">
          <input
            type="number"
            min="1"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <Field label="Delivery time (days)" required>
          <input
            type="number"
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
          hint="How you'd approach it, relevant experience, and anything you'd change about the milestones."
        >
          <textarea
            className={textareaClass}
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
            placeholder="Explain your approach and why you're the right fit…"
          />
        </Field>

        <Field
          label="Public note"
          required
          hint="Shown on the project for everyone to read — including other freelancers. Your price and proposal above stay private."
        >
          <textarea
            className={textareaClass}
            rows={3}
            maxLength={1000}
            value={publicNote}
            onChange={(e) => setPublicNote(e.target.value)}
            placeholder="e.g. Six years shooting weddings across Karnataka. Available on those dates and happy to travel."
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {publicNote.trim().length}/1000
          </p>
        </Field>
      </div>

      <div className="mt-5 flex gap-2">
        <Button
          className="flex-1 rounded-full bg-ink text-paper hover:bg-ink-soft"
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
