"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Printer,
  Download,
  Check,
  ShieldCheck,
  XCircle,
  Mail,
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
import { Field, textareaClass } from "@/components/shared/dashboard-ui";
import { InvoiceStatusPill } from "@/components/shared/invoice-ui";
import { UserAvatar, NameWithBadge } from "@/components/shared/marketplace-ui";
import {
  getInvoice,
  acknowledgeInvoice,
  payInvoice,
  cancelInvoice,
  emailInvoice,
} from "@/lib/services/invoices";
import { Invoice, Profile } from "@/types/marketplace";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

function InvoiceDetail({ profile }: { profile: Profile }) {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailNote, setEmailNote] = useState("");
  const [sending, setSending] = useState(false);

  const openEmailDialog = () => {
    setEmailNote("");
    setEmailOpen(true);
  };

  /**
   * Sends without a recipient: the server resolves it from the invoice's
   * billing email, falling back to the client's account email. Nobody has to
   * look up — or see — the other party's address to send them their invoice.
   */
  const sendEmail = async () => {
    if (!invoice) return;
    setSending(true);
    const { error } = await emailInvoice(invoice.id, {
      note: emailNote.trim() || undefined,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      profile.id === invoice.freelancer_id
        ? `Sent to ${invoice.to_name || "the client"}`
        : "Copy sent to you"
    );
    setEmailOpen(false);
    setEmailNote("");
  };

  /**
   * The PDF renderer is ~1MB, so it's imported only when someone actually
   * downloads — it never touches the initial page bundle.
   */
  const downloadPdf = async (inv: Invoice) => {
    setDownloading(true);
    try {
      const [{ pdf }, { InvoicePdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/shared/invoice-pdf"),
      ]);
      const blob = await pdf(<InvoicePdf invoice={inv} />).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${inv.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${inv.invoice_number}.pdf`);
    } catch (err: any) {
      toast.error(err?.message || "Could not generate the PDF");
    } finally {
      setDownloading(false);
    }
  };

  const load = useCallback(async () => {
    const { data } = await getInvoice(id);
    setInvoice(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const run = async (fn: () => Promise<{ error: any }>, msg: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) {
      toast.error(error.message || "Something went wrong");
      return;
    }
    toast.success(msg);
    load();
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="font-display mb-3 text-3xl font-semibold">Invoice not found</p>
        <p className="mb-6 text-muted-foreground">
          You may not have access to this invoice.
        </p>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/invoices">Back to invoices</Link>
        </Button>
      </div>
    );
  }

  const isClient = profile.id === invoice.client_id;
  const isFreelancer = profile.id === invoice.freelancer_id;
  const canPay = isClient && ["sent", "acknowledged"].includes(invoice.status);
  const canAcknowledge = isClient && invoice.status === "sent";
  const canCancel = isFreelancer && invoice.status !== "paid" && invoice.status !== "cancelled";

  return (
    <div className="mx-auto max-w-3xl pb-10">
      {/* Screen-only toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={downloading}
            onClick={() => downloadPdf(invoice)}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>

          <Button
            variant="outline"
            className="rounded-full"
            onClick={openEmailDialog}
          >
            <Mail className="mr-2 h-4 w-4" />
            {isFreelancer ? "Email to client" : "Email me a copy"}
          </Button>

          <Button
            variant="ghost"
            className="rounded-full text-muted-foreground"
            onClick={() => window.print()}
            aria-label="Print invoice"
          >
            <Printer className="h-4 w-4" />
          </Button>

          {canAcknowledge && (
            <Button
              variant="outline"
              className="rounded-full"
              disabled={busy}
              onClick={() => run(() => acknowledgeInvoice(invoice.id), "Invoice acknowledged")}
            >
              <Check className="mr-2 h-4 w-4" /> Acknowledge
            </Button>
          )}

          {canPay && (
            <Button
              className="rounded-full bg-ink text-paper hover:bg-ink-soft"
              disabled={busy}
              onClick={() =>
                run(
                  () => payInvoice(invoice.id),
                  `${formatPrice(invoice.total_amount)} released from escrow`
                )
              }
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Pay {formatPrice(invoice.total_amount)}
            </Button>
          )}

          {canCancel && (
            <Button
              variant="ghost"
              className="rounded-full text-muted-foreground hover:text-red-600"
              disabled={busy}
              onClick={() => run(() => cancelInvoice(invoice.id), "Invoice withdrawn")}
            >
              <XCircle className="mr-2 h-4 w-4" /> Withdraw
            </Button>
          )}
        </div>
      </div>

      {/* The document itself */}
      <article className="rounded-xl border border-border bg-white p-8 md:p-12 print:border-0 print:p-0">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-6 border-b border-border pb-8">
          <div>
            <div className="mb-3 flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-bold tracking-tight">
                {APP_NAME}
              </span>
              <span className="mb-0.5 inline-block h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
            </div>
            <p className="eyebrow mb-1">Invoice</p>
            <p className="font-display text-xl font-semibold">{invoice.invoice_number}</p>
          </div>

          <div className="text-right">
            <div className="mb-3">
              <InvoiceStatusPill status={invoice.status} />
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-end gap-3">
                <dt className="text-muted-foreground">Issued</dt>
                <dd className="font-medium">{formatDate(invoice.issued_at)}</dd>
              </div>
              {invoice.due_date && (
                <div className="flex justify-end gap-3">
                  <dt className="text-muted-foreground">Due</dt>
                  <dd className="font-medium">{formatDate(invoice.due_date)}</dd>
                </div>
              )}
              {invoice.paid_at && (
                <div className="flex justify-end gap-3">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd className="font-medium text-emerald-700">
                    {formatDate(invoice.paid_at)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </header>

        {/* Parties */}
        <div className="mb-10 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">From</p>
            <div className="flex items-center gap-3">
              <UserAvatar
                name={invoice.freelancer?.full_name || "Freelancer"}
                src={invoice.freelancer?.avatar_url}
                size={40}
              />
              <div className="min-w-0">
                <p className="font-semibold">
                  <NameWithBadge
                    name={invoice.freelancer?.full_name || "Freelancer"}
                    verified={invoice.freelancer?.is_verified}
                  />
                </p>
                {invoice.freelancer?.location && (
                  <p className="text-xs text-muted-foreground">
                    {invoice.freelancer.location}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3">Billed to</p>
            <div className="flex items-center gap-3">
              <UserAvatar
                name={invoice.client?.full_name || "Client"}
                src={invoice.client?.avatar_url}
                size={40}
              />
              <div className="min-w-0">
                <p className="font-semibold">
                  <NameWithBadge
                    name={invoice.client?.company_name || invoice.client?.full_name || "Client"}
                    verified={invoice.client?.is_verified}
                  />
                </p>
                {invoice.client?.location && (
                  <p className="text-xs text-muted-foreground">{invoice.client.location}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="mb-8 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary text-left">
                <th className="eyebrow px-5 py-3 font-semibold">Description</th>
                <th className="eyebrow px-5 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-5 py-4">
                  <p className="font-medium">{invoice.milestone_title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Milestone · {invoice.project_title}
                  </p>
                </td>
                <td className="px-5 py-4 text-right font-medium">
                  {formatPrice(invoice.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mb-8 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium">{formatPrice(invoice.amount)}</dd>
            </div>
            {invoice.tax_percent > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax ({invoice.tax_percent}%)</dt>
                <dd className="font-medium">{formatPrice(invoice.tax_amount)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-border pt-2">
              <dt className="font-semibold">Total due</dt>
              <dd className="font-display text-2xl font-semibold">
                {formatPrice(invoice.total_amount)}
              </dd>
            </div>
          </dl>
        </div>

        {invoice.notes && (
          <div className="mb-8 rounded-lg bg-secondary p-4">
            <p className="eyebrow mb-1.5">Notes</p>
            <p className="text-sm leading-relaxed text-foreground/85">{invoice.notes}</p>
          </div>
        )}

        <footer className="border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" />
            Escrow-backed
          </p>
          This milestone was funded into escrow before work began. Paying this
          invoice releases those held funds to the freelancer — no separate
          transfer is required.
        </footer>
      </article>

      {/* Context link, hidden when printing */}
      <div className="mt-6 text-center print:hidden">
        <Link
          href={`/contracts/${invoice.contract_id}`}
          className="link-editorial text-sm"
        >
          View the full contract and milestone timeline →
        </Link>
      </div>

      {/* Send dialog. The recipient is resolved server-side, so the address
          is never rendered here — only the name it's going to. */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Email {invoice.status === "paid" ? "receipt" : "invoice"}
            </DialogTitle>
            <DialogDescription>
              {`Sends ${invoice.invoice_number} with the PDF attached to `}
              <span className="font-medium text-foreground">
                {isFreelancer ? invoice.to_name || "the client" : "you"}
              </span>
              {isFreelancer ? ". Replies come back to you." : "."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Field label="Add a note" htmlFor="email_note">
              <textarea
                id="email_note"
                className={`${textareaClass} min-h-[90px]`}
                value={emailNote}
                onChange={(e) => setEmailNote(e.target.value)}
                placeholder="Optional — appears in the email body."
              />
            </Field>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setEmailOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full bg-ink text-paper hover:bg-ink-soft"
              disabled={sending}
              onClick={sendEmail}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InvoicePage() {
  return <WorkspaceShellFree>{(profile) => <InvoiceDetail profile={profile} />}</WorkspaceShellFree>;
}
