"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getMyPayoutAccount, getMyPayouts } from "@/lib/services/payouts";
import { formatPrice } from "@/lib/utils";

/**
 * Tells a freelancer their money has nowhere to go.
 *
 * A single notification at approval time is easy to miss, and the cost of
 * missing it is money sitting unpaid for as long as nobody notices -- which
 * is how Rs 5,050 came to be owed across two approved milestones with no
 * account on file.
 *
 * Two different messages, because they are two different situations:
 *
 *   MONEY WAITING   urgent and concrete. Name the amount; an abstract
 *                   reminder about "payout details" does not land the same
 *                   way as being told Rs 5,050 is stuck.
 *   NOTHING YET     a quiet nudge. Nobody is owed anything, so this is
 *                   housekeeping and should not look like an alarm.
 *
 * Renders nothing once an account exists, and nothing while the check is in
 * flight -- a banner that flashes on every page load is worse than no banner.
 */
export function PayoutDetailsBanner() {
  const [state, setState] = useState<
    { show: false } | { show: true; owed: number }
  >({ show: false });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [account, payouts] = await Promise.all([
        getMyPayoutAccount(),
        getMyPayouts(),
      ]);
      if (!alive || account.data) return;

      const owed = payouts.data
        .filter((p) => p.status !== "paid")
        .reduce((sum, p) => sum + p.amount, 0);

      setState({ show: true, owed });
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!state.show) return null;

  const urgent = state.owed > 0;

  return (
    <div
      className={`mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3.5 ${
        urgent
          ? "border-freelancer/40 bg-freelancer-soft"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            urgent ? "text-freelancer" : "text-muted-foreground"
          }`}
        />
        <div>
          <p
            className={`text-sm font-medium ${
              urgent ? "text-freelancer" : "text-foreground"
            }`}
          >
            {urgent
              ? `${formatPrice(state.owed)} is waiting to be sent to you`
              : "Add your payout details"}
          </p>
          <p
            className={`text-xs ${
              urgent ? "text-freelancer/80" : "text-muted-foreground"
            }`}
          >
            {urgent
              ? "We have nowhere to send it until you add a UPI ID or bank account."
              : "You will need these before you can bid, so it is worth doing now."}
          </p>
        </div>
      </div>

      <Button asChild size="sm" className="rounded-full">
        <Link href="/settings/payouts">
          <Wallet className="mr-1.5 h-3.5 w-3.5" /> Add payout details
        </Link>
      </Button>
    </div>
  );
}
