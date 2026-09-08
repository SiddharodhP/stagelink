"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Plus,
  Loader2,
} from "lucide-react";

import { WorkspaceShellFree } from "@/components/layout/workspace-shell-free";
import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
  StatTile,
  Field,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/shared/dashboard-ui";
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
  InvoiceStatusPill,
  RecurrenceStatusPill,
  OverduePill,
  isOverdue,
} from "@/components/shared/invoice-ui";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import { getMyInvoices } from "@/lib/services/invoices";
import {
  getMyRecurringInvoices,
  createRecurringInvoice,
  CADENCE_LABEL,
  CADENCE_NOUN,
} from "@/lib/services/recurring-invoices";
import { getMyContracts } from "@/lib/services/contracts";
import {
  Contract,
  Invoice,
  Profile,
  RecurringInvoice,
  RecurrenceCadence,
} from "@/types/marketplace";
import { formatPrice, formatDate, cn } from "@/lib/utils";
import {
  sumMoney,
  formatMoneySum,
  hasMoney,
  DEFAULT_CURRENCY,
} from "@/lib/currency";

const TABS = [
  { key: "open", label: "Open" },
  { key: "overdue", label: "Overdue" },
  { key: "retainers", label: "Retainers" },
  { key: "paid", label: "Paid" },
  { key: "all", label: "All" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const today = () => new Date().toISOString().slice(0, 10);

function InvoicesList({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [retainers, setRetainers] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("open");

  const isClient = profile.role === "client";

  // Retainer setup form
  const [setupOpen, setSetupOpen] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contractId: "",
    title: "",
    amount: "",
    cadence: "monthly" as RecurrenceCadence,
    startsOn: today(),
    paymentTermsDays: "7",
    taxPercent: "0",
    description: "",
    endsOn: "",
    maxOccurrences: "",
  });

  const load = useCallback(async () => {
    const [inv, rec] = await Promise.all([
      getMyInvoices(profile.id),
      getMyRecurringInvoices(profile.id),
    ]);
    setInvoices(inv.data);
    setRetainers(rec.data);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => {
    load();
  }, [load]);


  const openSetup = async () => {
    setSetupOpen(true);
    if (contracts.length) return;
    const { data } = await getMyContracts(profile.id);
    // Only contracts you're actively delivering can carry a retainer, and
    // only one live retainer is allowed per contract.
    const taken = new Set(
      retainers
        .filter((r) => ["pending_approval", "active", "paused"].includes(r.status))
        .map((r) => r.contract_id)
    );
    const eligible = data.filter(
      (c) =>
        c.status === "active" &&
        c.freelancer_id === profile.id &&
        !taken.has(c.id)
    );
    setContracts(eligible);
    setForm((f) => ({ ...f, contractId: eligible[0]?.id || "" }));
  };

  const submitRetainer = async () => {
    const amount = Math.round(Number(form.amount));
    if (!form.contractId) return toast.error("Pick a contract.");
    if (!form.title.trim()) return toast.error("Give the retainer a title.");
    if (!Number.isFinite(amount) || amount <= 0)
      return toast.error("Enter an amount greater than zero.");

    setSaving(true);
    const { id, error } = await createRecurringInvoice({
      contractId: form.contractId,
      title: form.title.trim(),
      amount,
      cadence: form.cadence,
      startsOn: form.startsOn || undefined,
      description: form.description.trim() || undefined,
      taxPercent: Number(form.taxPercent) || 0,
      paymentTermsDays: Number(form.paymentTermsDays) || 7,
      endsOn: form.endsOn || undefined,
      maxOccurrences: form.maxOccurrences
        ? Number(form.maxOccurrences)
        : undefined,
    });
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success("Retainer proposed — the client has to approve it before it bills.");
    setSetupOpen(false);
    if (id) router.push(`/invoices/recurring/${id}`);
  };

  const overdueInvoices = invoices.filter(isOverdue);

  const filtered = invoices.filter((i) => {
    if (tab === "all") return true;
    if (tab === "paid") return i.status === "paid";
    if (tab === "overdue") return isOverdue(i);
    return ["sent", "acknowledged"].includes(i.status);
  });

  const liveRetainers = retainers.filter((r) =>
    ["pending_approval", "active", "paused"].includes(r.status)
  );

  const counts = {
    open: invoices.filter((i) => ["sent", "acknowledged"].includes(i.status)).length,
    overdue: overdueInvoices.length,
    retainers: retainers.length,
    paid: invoices.filter((i) => i.status === "paid").length,
    all: invoices.length,
  };

  // Invoices can be in different currencies, so these are converted into
  // the viewer's own before summing. sumMoney marks the result approximate
  // when it had to convert — a plain reduce() here was adding rupees to
  // dollars and presenting the result as a fact.
  const viewerCurrency = profile.preferred_currency || DEFAULT_CURRENCY;
  const amountOf = (i: Invoice) => i.total_amount;
  const currencyOf = (i: Invoice) => i.currency;

  const outstanding = sumMoney(
    invoices.filter((i) => ["sent", "acknowledged"].includes(i.status)),
    amountOf, currencyOf, viewerCurrency);
  const settled = sumMoney(
    invoices.filter((i) => i.status === "paid"),
    amountOf, currencyOf, viewerCurrency);
  const overdueTotal = sumMoney(
    overdueInvoices, amountOf, currencyOf, viewerCurrency);

  // What the active retainers commit to per month, roughly — weekly and
  // fortnightly are normalised so the number is comparable.
  const perMonth = sumMoney(
    retainers.filter((r) => r.status === "active"),
    (r) => {
      const gross = r.amount + Math.round((r.amount * r.tax_percent) / 100);
      const factor =
        r.cadence === "weekly" ? 52 / 12 : r.cadence === "fortnightly" ? 26 / 12 : 1;
      return gross * factor;
    },
    (r) => r.currency,
    viewerCurrency
  );

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={isClient ? "Client workspace" : "Freelancer workspace"}
        title="Invoices"
        description={
          isClient
            ? "Invoices your freelancers have issued — one-off milestones and ongoing retainers."
            : "Invoices you've issued, plus any recurring retainers billing on a schedule."
        }
        action={
          !isClient ? (
            <Button className="rounded-full bg-ink text-paper hover:bg-ink-soft" onClick={openSetup}>
              <Plus className="mr-2 h-4 w-4" /> New retainer
            </Button>
          ) : undefined
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label={isClient ? "Awaiting payment" : "Outstanding"}
          value={formatMoneySum(outstanding)}
          icon={FileText}
          hint={`${counts.open} invoice${counts.open === 1 ? "" : "s"}`}
        />
        {counts.overdue > 0 ? (
          <StatTile
            label="Overdue"
            value={formatMoneySum(overdueTotal)}
            icon={AlertTriangle}
            hint={`${counts.overdue} past due`}
          />
        ) : (
          <StatTile
            label={isClient ? "Total paid" : "Total received"}
            value={formatMoneySum(settled)}
            icon={ArrowUpRight}
            hint={`${counts.paid} settled`}
          />
        )}
        <StatTile
          label="Recurring"
          value={hasMoney(perMonth) ? `${formatMoneySum(perMonth, viewerCurrency)}/mo` : "—"}
          icon={RefreshCw}
          hint={`${liveRetainers.length} live retainer${liveRetainers.length === 1 ? "" : "s"}`}
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-ink text-paper"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              t.key === "overdue" && counts.overdue > 0 && tab !== t.key && "text-rose-700"
            )}
          >
            {t.label}
            <span className="ml-1.5 opacity-60">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonRows count={3} height={92} />
      ) : tab === "retainers" ? (
        retainers.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            {retainers.map((r) => {
              const other = isClient ? r.freelancer : r.client;
              const gross = r.amount + Math.round((r.amount * r.tax_percent) / 100);
              return (
                <Link
                  key={r.id}
                  href={`/invoices/recurring/${r.id}`}
                  className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-secondary"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar
                      name={other?.full_name || "User"}
                      src={other?.avatar_url}
                      size={36}
                    />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {r.title}
                        <RecurrenceStatusPill status={r.status} />
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {CADENCE_LABEL[r.cadence]} · {r.project?.title || "Project"}
                        {r.status === "active"
                          ? ` · next ${formatDate(r.next_run_on)}`
                          : r.occurrences_created > 0
                            ? ` · ${r.occurrences_created} issued`
                            : ""}
                      </p>
                    </div>
                  </div>
                  <span className="font-display shrink-0 text-lg font-semibold">
                    {formatPrice(gross)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      /{CADENCE_NOUN[r.cadence]}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyCard
            icon={RefreshCw}
            title="No retainers yet"
            description={
              isClient
                ? "If a freelancer proposes an ongoing weekly or monthly arrangement, it shows up here for you to approve before anything is billed."
                : "Bill an ongoing client automatically every week, fortnight or month. Invoices are issued on schedule and chased if they go unpaid."
            }
            actionLabel={isClient ? "Browse freelancers" : undefined}
            actionHref={isClient ? "/discover" : undefined}
          />
        )
      ) : filtered.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          {filtered.map((inv) => {
            const other = isClient ? inv.freelancer : inv.client;
            return (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-secondary"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    name={other?.full_name || "User"}
                    src={other?.avatar_url}
                    size={36}
                  />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      {inv.invoice_number}
                      {inv.kind === "recurring" && (
                        <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <InvoiceStatusPill status={inv.status} />
                      <OverduePill invoice={inv} />
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {inv.milestone_title} · {inv.project_title}
                      {" · "}
                      {formatDate(inv.issued_at)}
                    </p>
                  </div>
                </div>
                <span className="font-display shrink-0 text-lg font-semibold">
                  {formatPrice(inv.total_amount, inv.currency)}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyCard
          icon={tab === "overdue" ? AlertTriangle : FileText}
          title={
            tab === "all"
              ? "No invoices yet"
              : tab === "overdue"
                ? "Nothing overdue"
                : `No ${tab} invoices`
          }
          description={
            tab === "overdue"
              ? "Every invoice is either paid or still within its payment terms."
              : isClient
                ? "When a freelancer delivers a milestone, their invoice appears here for you to acknowledge and pay."
                : "Deliver a milestone, then send an invoice from the contract page in one click."
          }
          actionLabel="View contracts"
          actionHref={isClient ? "/client/contracts" : "/freelancer/contracts"}
        />
      )}

      {/* Retainer setup. Freelancer proposes; nothing bills until the
          client approves it on the retainer page. */}
      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Set up a retainer</DialogTitle>
            <DialogDescription>
              Bills this client automatically on a schedule. Your client has to
              approve it first, and can pause or end it at any time.
            </DialogDescription>
          </DialogHeader>

          {contracts.length === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">
              You need an active contract to set up a retainer, and each contract
              can only have one. Accept a contract first, then come back.
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <Field label="Contract" htmlFor="r_contract" required>
                <select
                  id="r_contract"
                  className={selectClass}
                  value={form.contractId}
                  onChange={(e) => setForm({ ...form, contractId: e.target.value })}
                >
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.project?.title || "Project"} —{" "}
                      {c.client?.company_name || c.client?.full_name || "Client"}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="What are you billing for?"
                htmlFor="r_title"
                required
                hint="Appears on every invoice this generates."
              >
                <input
                  id="r_title"
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Weekly social media retainer"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Amount per period" htmlFor="r_amount" required>
                  <input
                    id="r_amount"
                    type="number"
                    min={1}
                    className={inputClass}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="15000"
                  />
                </Field>
                <Field label="How often" htmlFor="r_cadence" required>
                  <select
                    id="r_cadence"
                    className={selectClass}
                    value={form.cadence}
                    onChange={(e) =>
                      setForm({ ...form, cadence: e.target.value as RecurrenceCadence })
                    }
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Every 2 weeks</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="First invoice on" htmlFor="r_start" required>
                  <input
                    id="r_start"
                    type="date"
                    min={today()}
                    className={inputClass}
                    value={form.startsOn}
                    onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
                  />
                </Field>
                <Field
                  label="Payment terms"
                  htmlFor="r_terms"
                  hint="Days to pay before it counts as overdue."
                >
                  <input
                    id="r_terms"
                    type="number"
                    min={0}
                    max={90}
                    className={inputClass}
                    value={form.paymentTermsDays}
                    onChange={(e) =>
                      setForm({ ...form, paymentTermsDays: e.target.value })
                    }
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Tax %" htmlFor="r_tax" hint="0 if not applicable.">
                  <input
                    id="r_tax"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    className={inputClass}
                    value={form.taxPercent}
                    onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
                  />
                </Field>
                <Field
                  label="Stop after"
                  htmlFor="r_max"
                  hint="Optional — leave blank to run until cancelled."
                >
                  <input
                    id="r_max"
                    type="number"
                    min={1}
                    className={inputClass}
                    value={form.maxOccurrences}
                    onChange={(e) =>
                      setForm({ ...form, maxOccurrences: e.target.value })
                    }
                    placeholder="e.g. 12"
                  />
                </Field>
              </div>

              <Field
                label="What's included"
                htmlFor="r_desc"
                hint="Optional — appears on the invoice as the deliverables."
              >
                <textarea
                  id="r_desc"
                  className={`${textareaClass} min-h-[80px]`}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="4 shoots per month, edited and delivered within 5 days."
                />
              </Field>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setSetupOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full bg-ink text-paper hover:bg-ink-soft"
              disabled={saving || contracts.length === 0}
              onClick={submitRetainer}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InvoicesPage() {
  return <WorkspaceShellFree>{(profile) => <InvoicesList profile={profile} />}</WorkspaceShellFree>;
}
