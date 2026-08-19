"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Wallet,
  Upload,
  Check,
  RotateCcw,
  AlertTriangle,
  MessageSquare,
  Star,
  XCircle,
  Send,
  Receipt,
} from "lucide-react";

import { WorkspaceShellFree } from "@/components/layout/workspace-shell-free";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  SectionCard,
  inputClass,
  textareaClass,
} from "@/components/shared/dashboard-ui";
import { MilestoneList } from "@/components/shared/milestone-list";
import {
  ContractStatusPill,
  MilestoneStatusPill,
  NameWithBadge,
  UserAvatar,
} from "@/components/shared/marketplace-ui";
import {
  getContract,
  getContractMilestones,
  getMilestoneSubmissions,
  // invoice helpers live in their own service; imported separately below
  getContractReviews,
  respondContract,
  fundMilestone,
  submitMilestone,
  approveMilestone,
  requestRevision,
  openDispute,
  cancelContract,
  createReview,
} from "@/lib/services/contracts";
import { createInvoice, getContractInvoices } from "@/lib/services/invoices";
import { InvoiceStatusPill } from "@/components/shared/invoice-ui";
import { getOrCreateConversation } from "@/lib/services/messaging";
import { uploadFile } from "@/lib/services/storage";
import {
  Contract,
  Invoice,
  Milestone,
  MilestoneSubmission,
  Profile,
} from "@/types/marketplace";
import { formatPrice, formatDate, cn } from "@/lib/utils";

type DialogKind =
  | { kind: "submit"; milestone: Milestone }
  | { kind: "revision"; milestone: Milestone }
  | { kind: "dispute"; milestone: Milestone }
  | { kind: "review" }
  | { kind: "cancel" }
  | null;

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            className={cn(
              "h-7 w-7 transition-colors",
              (hover || value) >= n ? "fill-amber-500 text-amber-500" : "text-border"
            )}
          />
        </button>
      ))}
    </div>
  );
}

function Workspace({ profile }: { profile: Profile }) {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [contract, setContract] = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [submissions, setSubmissions] = useState<MilestoneSubmission[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<DialogKind>(null);

  // dialog form state
  const [note, setNote] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [reason, setReason] = useState("");
  const [rating, setRating] = useState(0);

  const load = useCallback(async () => {
    const { data } = await getContract(id);
    if (!data) {
      setLoading(false);
      return;
    }
    setContract(data);
    const [{ data: ms }, { data: subs }, { data: revs }, { data: invs }] =
      await Promise.all([
        getContractMilestones(data.project_id),
        getMilestoneSubmissions(data.id),
        getContractReviews(data.id),
        getContractInvoices(data.id),
      ]);
    setMilestones(ms);
    setSubmissions(subs);
    setInvoices(invs);
    setHasReviewed(revs.some((r: any) => r.reviewer_id === profile.id));
    setLoading(false);
  }, [id, profile.id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const closeDialog = () => {
    setDialog(null);
    setNote("");
    setAttachmentUrl("");
    setReason("");
    setRating(0);
  };

  const run = async (fn: () => Promise<{ error: any }>, successMsg: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      toast.error(error.message || "Something went wrong");
      return false;
    }
    toast.success(successMsg);
    closeDialog();
    await load();
    return true;
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="font-display mb-3 text-3xl font-semibold">Contract not found</p>
        <p className="mb-6 text-muted-foreground">
          You may not have access to this contract.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    );
  }

  const isClient = profile.id === contract.client_id;
  const other = isClient ? contract.freelancer : contract.client;
  const isActive = contract.status === "active";
  const isPending = contract.status === "pending_acceptance";
  const isOver = ["completed", "cancelled"].includes(contract.status);

  const paidTotal = milestones
    .filter((m) => m.status === "paid")
    .reduce((s, m) => s + m.amount, 0);
  const totalValue = milestones
    .filter((m) => m.status !== "cancelled")
    .reduce((s, m) => s + m.amount, 0);
  const progress = totalValue ? Math.round((paidTotal / totalValue) * 100) : 0;
  const activeMilestone = milestones.find(
    (m) => !["paid", "cancelled"].includes(m.status)
  );

  /** Whose turn is it? Drives the banner at the top. */
  const nextAction = (() => {
    if (isPending)
      return isClient
        ? { who: "them", text: "Waiting for the freelancer to confirm your milestone structure." }
        : { who: "you", text: "Review the milestones below and confirm to start work." };
    if (!isActive) return null;
    if (!activeMilestone) return null;
    switch (activeMilestone.status) {
      case "pending":
        return isClient
          ? { who: "you", text: `Fund "${activeMilestone.title}" to let work begin.` }
          : { who: "them", text: `Waiting for the client to fund "${activeMilestone.title}".` };
      case "in_progress":
      case "revision_requested":
        return isClient
          ? { who: "them", text: `Freelancer is working on "${activeMilestone.title}".` }
          : { who: "you", text: `Deliver "${activeMilestone.title}" and submit it for review.` };
      case "submitted":
        return isClient
          ? { who: "you", text: `Review "${activeMilestone.title}" and approve to release payment.` }
          : { who: "them", text: `Waiting for the client to review "${activeMilestone.title}".` };
      case "disputed":
        return { who: "them", text: "This milestone is under dispute review." };
      default:
        return null;
    }
  })();

  const milestoneActions = (m: Milestone) => {
    // Completed contracts still render actions so a freelancer can generate
    // receipts for past milestones. Every button below gates on the
    // milestone's own status, so nothing else becomes available.
    if (!isActive && !isOver) return null;
    const subs = submissions.filter((s) => s.milestone_id === m.id);
    const invoice = invoices.find(
      (i) => i.milestone_id === m.id && i.status !== "cancelled"
    );

    return (
      <div className="space-y-3">
        {/* Invoice for this milestone, once one exists */}
        {invoice && (
          <Link
            href={`/invoices/${invoice.id}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white p-3 transition-colors hover:border-ink/40"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <Receipt className="h-4 w-4 shrink-0 text-brand" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  {invoice.invoice_number}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {isClient ? "Invoice received" : "Invoice sent"} ·{" "}
                  {formatPrice(invoice.total_amount)}
                </span>
              </span>
            </span>
            <InvoiceStatusPill status={invoice.status} />
          </Link>
        )}

        {subs.length > 0 && (
          <div className="rounded-lg border border-border bg-secondary p-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Latest submission · {formatDate(subs[0].created_at)}
            </p>
            <p className="text-foreground/85">{subs[0].note}</p>
            {subs[0].attachment_url && (
              <a
                href={subs[0].attachment_url}
                target="_blank"
                rel="noreferrer"
                className="link-editorial mt-1.5 inline-block text-xs"
              >
                View deliverable →
              </a>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {isClient && m.status === "pending" && (
            <Button
              size="sm"
              className="rounded-full bg-ink text-paper hover:bg-ink-soft"
              disabled={busy}
              onClick={() =>
                run(() => fundMilestone(m.id), `${formatPrice(m.amount)} moved into escrow`)
              }
            >
              <Wallet className="mr-1.5 h-3.5 w-3.5" /> Fund {formatPrice(m.amount)}
            </Button>
          )}

          {!isClient && ["in_progress", "revision_requested"].includes(m.status) && (
            <Button
              size="sm"
              className="rounded-full bg-ink text-paper hover:bg-ink-soft"
              onClick={() => setDialog({ kind: "submit", milestone: m })}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" /> Submit work
            </Button>
          )}

          {/* One-click invoicing on any delivered milestone. Already-paid
              work produces a receipt rather than a payment request. */}
          {!isClient &&
            ["submitted", "revision_requested", "paid"].includes(m.status) &&
            !invoice && (
              <Button
                size="sm"
                variant={m.status === "paid" ? "outline" : "default"}
                className={cn(
                  "rounded-full",
                  m.status !== "paid" && "bg-ink text-paper hover:bg-ink-soft"
                )}
                disabled={busy}
                onClick={() =>
                  run(
                    async () => {
                      const { error } = await createInvoice(m.id);
                      return { error };
                    },
                    m.status === "paid"
                      ? `Receipt generated for ${formatPrice(m.amount)}`
                      : `Invoice sent for ${formatPrice(m.amount)}`
                  )
                }
              >
                <Receipt className="mr-1.5 h-3.5 w-3.5" />
                {m.status === "paid" ? "Generate receipt" : "Send invoice"}
              </Button>
            )}

          {isClient && m.status === "submitted" && (
            <>
              <Button
                size="sm"
                className="rounded-full bg-ink text-paper hover:bg-ink-soft"
                disabled={busy}
                onClick={() =>
                  run(
                    () => approveMilestone(m.id),
                    `${formatPrice(m.amount)} released to the freelancer`
                  )
                }
              >
                <Check className="mr-1.5 h-3.5 w-3.5" /> Approve & release
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setDialog({ kind: "revision", milestone: m })}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Request revision
              </Button>
            </>
          )}

          {["in_progress", "submitted", "revision_requested"].includes(m.status) && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-muted-foreground hover:text-red-600"
              onClick={() => setDialog({ kind: "dispute", milestone: m })}
            >
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Raise dispute
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-3">
            <ContractStatusPill status={contract.status} />
            <span className="text-sm text-muted-foreground">
              Started {contract.started_at ? formatDate(contract.started_at) : "—"}
            </span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {contract.project?.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={async () => {
              const { data } = await getOrCreateConversation(
                profile.id,
                isClient ? contract.freelancer_id : contract.client_id,
                contract.project_id
              );
              if (data) router.push(`/messages?c=${data.id}`);
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4" /> Message
          </Button>
          {(isActive || isPending) && (
            <Button
              variant="ghost"
              className="rounded-full text-muted-foreground hover:text-red-600"
              onClick={() => setDialog({ kind: "cancel" })}
            >
              <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Next action banner */}
      {nextAction && (
        <div
          className={cn(
            "mb-6 flex items-start gap-3 rounded-xl border p-4",
            nextAction.who === "you"
              ? "border-brand/30 bg-brand-soft"
              : "border-border bg-white"
          )}
        >
          <span
            className={cn(
              "mt-0.5 rounded-full p-1.5",
              nextAction.who === "you" ? "bg-brand text-white" : "bg-secondary text-muted-foreground"
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {nextAction.who === "you" ? "Your move" : "Waiting on them"}
            </p>
            <p className="text-sm text-muted-foreground">{nextAction.text}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Milestone workspace */}
        <div className="min-w-0 space-y-6">
          {isPending && !isClient && (
            <SectionCard
              title="Confirm the milestone structure"
              description="Read every milestone carefully. Once you accept, this becomes the agreed plan of work."
            >
              <MilestoneList milestones={milestones} />
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  className="rounded-full bg-ink px-8 text-paper hover:bg-ink-soft"
                  disabled={busy}
                  onClick={() =>
                    run(() => respondContract(contract.id, true), "Contract accepted — work can begin")
                  }
                >
                  <Check className="mr-2 h-4 w-4" /> I agree — start the project
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full text-red-600 hover:bg-red-50"
                  disabled={busy}
                  onClick={() =>
                    run(() => respondContract(contract.id, false), "Contract declined")
                  }
                >
                  Decline
                </Button>
              </div>
            </SectionCard>
          )}

          {isPending && isClient && (
            <SectionCard
              title="Awaiting confirmation"
              description="The freelancer is reviewing your milestone structure."
            >
              <MilestoneList milestones={milestones} />
            </SectionCard>
          )}

          {!isPending && (
            <SectionCard
              title="Milestones"
              description={
                isClient
                  ? "Fund each milestone to start it, then approve to release payment."
                  : "Complete each milestone and submit it for the client's review."
              }
            >
              <MilestoneList
                milestones={milestones}
                showStatus
                activeId={activeMilestone?.id}
                renderActions={milestoneActions}
              />
            </SectionCard>
          )}

          {isOver && !hasReviewed && (
            <SectionCard
              title={`Rate your ${isClient ? "freelancer" : "client"}`}
              description="Reviews are public and build reputation on both sides of the marketplace."
            >
              <Button
                className="rounded-full bg-ink text-paper hover:bg-ink-soft"
                onClick={() => setDialog({ kind: "review" })}
              >
                <Star className="mr-2 h-4 w-4" /> Write a review
              </Button>
            </SectionCard>
          )}

          {isOver && hasReviewed && (
            <div className="rounded-xl border border-border bg-white p-5 text-sm text-muted-foreground">
              You&apos;ve already reviewed this contract. Thanks for keeping the
              marketplace honest.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-white p-6">
            <h2 className="eyebrow mb-4">Progress</h2>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="font-display text-3xl font-semibold">{progress}%</span>
              <span className="text-xs text-muted-foreground">
                {formatPrice(paidTotal)} of {formatPrice(totalValue)} released
              </span>
            </div>
            <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <dl className="space-y-2.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Agreed price</dt>
                <dd className="font-display text-base font-semibold">
                  {formatPrice(contract.agreed_amount)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Milestones</dt>
                <dd className="font-medium">
                  {milestones.filter((m) => m.status === "paid").length} / {milestones.length} paid
                </dd>
              </div>
              {activeMilestone && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Current stage</dt>
                  <dd>
                    <MilestoneStatusPill status={activeMilestone.status} />
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-border bg-white p-6">
            <h2 className="eyebrow mb-4">{isClient ? "Freelancer" : "Client"}</h2>
            <Link
              href={`/u/${other?.id}`}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <UserAvatar name={other?.full_name || "User"} src={other?.avatar_url} size={44} />
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  <NameWithBadge
                    name={other?.company_name || other?.full_name || "User"}
                    verified={other?.is_verified}
                  />
                </p>
                {other?.headline && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{other.headline}</p>
                )}
              </div>
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-brand-soft p-5 text-sm leading-relaxed text-foreground/80">
            <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-brand" />
              Escrow protection
            </p>
            Funds for each milestone are held by the platform from the moment the
            client funds them until the work is approved.
          </div>
        </aside>
      </div>

      {/* ---------- Dialogs ---------- */}

      <Dialog open={dialog?.kind === "submit"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Submit your work</DialogTitle>
            <DialogDescription>
              {dialog?.kind === "submit" && dialog.milestone.title} — the client
              reviews this and releases{" "}
              {dialog?.kind === "submit" && formatPrice(dialog.milestone.amount)} on approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field label="What did you deliver?" required>
              <textarea
                className={textareaClass}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Summarise what's included, any notes, and where to find it…"
              />
            </Field>
            <Field label="Attach a file" hint="Optional — or paste a link in the note above.">
              <input
                type="file"
                className={cn(inputClass, "py-2.5 file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-xs")}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  toast.info("Uploading…");
                  const { url, error } = await uploadFile("deliverables", profile.id, file);
                  if (error || !url) toast.error("Upload failed");
                  else {
                    setAttachmentUrl(url);
                    toast.success("File attached");
                  }
                }}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-ink text-paper hover:bg-ink-soft"
              disabled={busy || note.trim().length === 0}
              onClick={() =>
                dialog?.kind === "submit" &&
                run(
                  () => submitMilestone(dialog.milestone.id, note.trim(), attachmentUrl || null),
                  "Submitted for review"
                )
              }
            >
              <Send className="mr-2 h-4 w-4" /> Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === "revision"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Request a revision</DialogTitle>
            <DialogDescription>
              Be specific about what needs to change — vague feedback costs both
              of you time.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Field label="What needs changing?" required>
              <textarea
                className={textareaClass}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-ink text-paper hover:bg-ink-soft"
              disabled={busy || note.trim().length === 0}
              onClick={() =>
                dialog?.kind === "revision" &&
                run(() => requestRevision(dialog.milestone.id, note.trim()), "Revision requested")
              }
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === "dispute"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Raise a dispute</DialogTitle>
            <DialogDescription>
              This pauses the milestone and escalates it to platform review. Use
              it when you can&apos;t resolve things directly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Reason" required>
              <input
                className={inputClass}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Deliverable doesn't match the agreed scope"
              />
            </Field>
            <Field label="Details">
              <textarea
                className={textareaClass}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened, and what outcome are you looking for?"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
              disabled={busy || reason.trim().length === 0}
              onClick={() =>
                dialog?.kind === "dispute" &&
                run(
                  async () => {
                    const { error } = await openDispute(
                      dialog.milestone.id,
                      reason.trim(),
                      note.trim()
                    );
                    return { error };
                  },
                  "Dispute opened — an admin will review it"
                )
              }
            >
              Open dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === "review"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Rate {other?.full_name}
            </DialogTitle>
            <DialogDescription>
              Public on their profile and part of their marketplace reputation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Rating" required>
              <StarPicker value={rating} onChange={setRating} />
            </Field>
            <Field label="Your review">
              <textarea
                className={textareaClass}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Communication, quality, deadlines — what should others know?"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              className="rounded-full bg-ink text-paper hover:bg-ink-soft"
              disabled={busy || rating === 0}
              onClick={() =>
                run(() => createReview(contract.id, rating, note.trim()), "Review published")
              }
            >
              Publish review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog?.kind === "cancel"} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Cancel this contract?</DialogTitle>
            <DialogDescription>
              Any escrowed funds for unfinished milestones are refunded to the
              client. Completed and paid milestones are unaffected.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Field label="Reason" required>
              <textarea
                className={textareaClass}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={closeDialog}>
              Keep contract
            </Button>
            <Button
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
              disabled={busy || reason.trim().length === 0}
              onClick={() =>
                run(() => cancelContract(contract.id, reason.trim()), "Contract cancelled")
              }
            >
              Cancel contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ContractPage() {
  return <WorkspaceShellFree>{(profile) => <Workspace profile={profile} />}</WorkspaceShellFree>;
}
