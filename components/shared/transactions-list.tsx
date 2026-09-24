"use client";

import { useEffect, useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, RotateCcw } from "lucide-react";

import {
  PageHeader,
  EmptyCard,
  SkeletonRows,
  StatTile,
} from "@/components/shared/dashboard-ui";
import { getMyTransactions } from "@/lib/services/contracts";
import { Profile, Transaction } from "@/types/marketplace";
import { formatPrice, formatDate, cn } from "@/lib/utils";

const TYPE_META: Record<
  string,
  { label: string; icon: typeof Wallet; tone: string }
> = {
  escrow_fund: { label: "Funded into escrow", icon: ArrowUpRight, tone: "text-amber-700 dark:text-amber-300" },
  release: { label: "Released", icon: ArrowDownLeft, tone: "text-emerald-700 dark:text-emerald-300" },
  refund: { label: "Refunded", icon: RotateCcw, tone: "text-sky-700 dark:text-sky-300" },
};

/** Shared payment ledger — labelled from the viewer's perspective. */
export function TransactionsList({ profile }: { profile: Profile }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const isClient = profile.role === "client";

  useEffect(() => {
    getMyTransactions(profile.id).then(({ data }) => {
      setTransactions(data);
      setLoading(false);
    });
  }, [profile.id]);

  const earned = transactions
    .filter((t) => t.type === "release" && t.payee_id === profile.id)
    .reduce((s, t) => s + t.amount, 0);
  const funded = transactions
    .filter((t) => t.type === "escrow_fund" && t.payer_id === profile.id)
    .reduce((s, t) => s + t.amount, 0);
  const refunded = transactions
    .filter((t) => t.type === "refund" && t.payee_id === profile.id)
    .reduce((s, t) => s + t.amount, 0);
  const released = transactions
    .filter((t) => t.type === "release" && t.payer_id === profile.id)
    .reduce((s, t) => s + t.amount, 0);
  const inEscrow = Math.max(0, funded - released - refunded);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={isClient ? "Client workspace" : "Freelancer workspace"}
        title={isClient ? "Payments" : "Earnings"}
        description={
          isClient
            ? "Every escrow deposit, release, and refund on your projects."
            : "Milestone payments released to you, with full history."
        }
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isClient ? (
          <>
            <StatTile label="Total funded" value={formatPrice(funded)} icon={Wallet} />
            <StatTile
              label="Held in escrow"
              value={formatPrice(inEscrow)}
              icon={ArrowUpRight}
              hint="Awaiting milestone approval"
            />
            <StatTile label="Refunded to you" value={formatPrice(refunded)} icon={RotateCcw} />
          </>
        ) : (
          <>
            <StatTile label="Total earned" value={formatPrice(earned)} icon={Wallet} />
            <StatTile
              label="Payments received"
              value={transactions.filter((t) => t.type === "release" && t.payee_id === profile.id).length}
              icon={ArrowDownLeft}
            />
            <StatTile
              label="Average per milestone"
              value={formatPrice(
                Math.round(
                  earned /
                    Math.max(
                      1,
                      transactions.filter((t) => t.type === "release" && t.payee_id === profile.id).length
                    )
                )
              )}
              icon={ArrowUpRight}
            />
          </>
        )}
      </div>

      {loading ? (
        <SkeletonRows count={4} height={72} />
      ) : transactions.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="eyebrow px-5 py-3 font-semibold">Date</th>
                <th className="eyebrow px-5 py-3 font-semibold">Description</th>
                <th className="eyebrow px-5 py-3 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((t) => {
                const meta = TYPE_META[t.type];
                const Icon = meta.icon;
                const incoming = t.payee_id === profile.id && t.type !== "escrow_fund";
                return (
                  <tr key={t.id} className="transition-colors hover:bg-secondary/50">
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2.5">
                        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.tone)} />
                        <div className="min-w-0">
                          <p className="font-medium">{meta.label}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {t.milestone?.title ? `${t.milestone.title} · ` : ""}
                            {t.project?.title}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-5 py-4 text-right font-display text-base font-semibold",
                        incoming ? "text-emerald-700 dark:text-emerald-300" : ""
                      )}
                    >
                      {incoming ? "+" : ""}
                      {formatPrice(t.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyCard
          icon={Wallet}
          title="No transactions yet"
          description={
            isClient
              ? "Once you fund your first milestone, every movement of money shows up here."
              : "When a client approves your first milestone, the payment will appear here."
          }
        />
      )}
    </div>
  );
}
