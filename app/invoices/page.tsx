"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, ArrowUpRight } from "lucide-react";

import { WorkspaceShellFree } from "@/components/layout/workspace-shell-free";
import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
  StatTile,
} from "@/components/shared/dashboard-ui";
import { InvoiceStatusPill } from "@/components/shared/invoice-ui";
import { UserAvatar } from "@/components/shared/marketplace-ui";
import { getMyInvoices } from "@/lib/services/invoices";
import { Invoice, Profile } from "@/types/marketplace";
import { formatPrice, formatDate, cn } from "@/lib/utils";

const TABS = [
  { key: "open", label: "Open" },
  { key: "paid", label: "Paid" },
  { key: "all", label: "All" },
] as const;

function InvoicesList({ profile }: { profile: Profile }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("open");

  const isClient = profile.role === "client";

  useEffect(() => {
    getMyInvoices(profile.id).then(({ data }) => {
      setInvoices(data);
      setLoading(false);
    });
  }, [profile.id]);

  const filtered = invoices.filter((i) => {
    if (tab === "all") return true;
    if (tab === "paid") return i.status === "paid";
    return ["sent", "acknowledged"].includes(i.status);
  });

  const counts = {
    open: invoices.filter((i) => ["sent", "acknowledged"].includes(i.status)).length,
    paid: invoices.filter((i) => i.status === "paid").length,
    all: invoices.length,
  };

  const outstanding = invoices
    .filter((i) => ["sent", "acknowledged"].includes(i.status))
    .reduce((s, i) => s + i.total_amount, 0);
  const settled = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.total_amount, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={isClient ? "Client workspace" : "Freelancer workspace"}
        title="Invoices"
        description={
          isClient
            ? "Invoices your freelancers have issued against delivered milestones."
            : "Invoices you've issued. Paying one releases that milestone's escrow."
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label={isClient ? "Awaiting payment" : "Outstanding"}
          value={formatPrice(outstanding)}
          icon={FileText}
          hint={`${counts.open} invoice${counts.open === 1 ? "" : "s"}`}
        />
        <StatTile
          label={isClient ? "Total paid" : "Total received"}
          value={formatPrice(settled)}
          icon={ArrowUpRight}
          hint={`${counts.paid} settled`}
        />
        <StatTile label="All invoices" value={counts.all} icon={FileText} />
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
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {t.label}
            <span className="ml-1.5 opacity-60">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonRows count={3} height={92} />
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
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {inv.invoice_number}
                      <InvoiceStatusPill status={inv.status} />
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {inv.milestone_title} · {inv.project_title}
                      {" · "}
                      {formatDate(inv.issued_at)}
                    </p>
                  </div>
                </div>
                <span className="font-display shrink-0 text-lg font-semibold">
                  {formatPrice(inv.total_amount)}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyCard
          icon={FileText}
          title={tab === "all" ? "No invoices yet" : `No ${tab} invoices`}
          description={
            isClient
              ? "When a freelancer delivers a milestone, their invoice appears here for you to acknowledge and pay."
              : "Deliver a milestone, then send an invoice from the contract page in one click."
          }
          actionLabel={isClient ? "View contracts" : "View contracts"}
          actionHref={isClient ? "/client/contracts" : "/freelancer/contracts"}
        />
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return <WorkspaceShellFree>{(profile) => <InvoicesList profile={profile} />}</WorkspaceShellFree>;
}
