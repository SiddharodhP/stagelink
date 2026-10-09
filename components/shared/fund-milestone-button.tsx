"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

/**
 * Funds one milestone through Razorpay Checkout.
 *
 * The amount is never sent from here. The server reads it from the milestone
 * row, because a payer who can name their own price is not paying a price.
 *
 * WHAT THIS BUTTON DOES NOT DO
 *
 * It does not mark the milestone funded. Checkout's success handler fires in
 * a browser, and a browser can be made to say anything; only the webhook,
 * signed with a secret that never leaves the server, is proof. So success
 * here means "Razorpay accepted the card" and the UI says the confirmation
 * is coming -- usually within a second or two, which is why it polls briefly
 * rather than asking the user to refresh.
 */

type Props = {
  milestoneId: string;
  amount: number;
  /** Called once the milestone is confirmed funded, to refresh the page. */
  onFunded: () => void;
  disabled?: boolean;
};

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/** Loads Checkout once per page, and resolves immediately if it is there. */
function loadCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.Razorpay) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CHECKOUT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("checkout failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("checkout failed to load"));
    document.body.appendChild(script);
  });
}

export function FundMilestoneButton({ milestoneId, amount, onFunded, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const pay = async () => {
    setBusy(true);
    try {
      await loadCheckout();

      const res = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order?.error || "Could not start the payment");

      const rzp = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "jayree.io",
        description: order.milestoneTitle,
        theme: { color: "#d6440f" },
        handler: () => {
          // Razorpay took the money. The milestone is not funded until the
          // webhook says so, so wait for that rather than claiming it here.
          setAwaiting(true);
          toast.success("Payment received — confirming with your bank…");
          waitForConfirmation();
        },
        modal: {
          ondismiss: () => {
            if (alive.current) setBusy(false);
          },
        },
      });
      rzp.open();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the payment");
      if (alive.current) setBusy(false);
    }
  };

  /**
   * The webhook usually lands within a second or two, but it is a separate
   * network path and nothing guarantees it is first. Poll briefly, then stop
   * and tell the truth rather than spinning forever.
   */
  const waitForConfirmation = async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, 1500));
      if (!alive.current) return;
      onFunded();
    }
    if (!alive.current) return;
    setAwaiting(false);
    setBusy(false);
  };

  return (
    <Button
      size="sm"
      className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
      disabled={disabled || busy}
      onClick={pay}
    >
      {busy ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <Wallet className="mr-1.5 h-3.5 w-3.5" />
      )}
      {awaiting ? "Confirming…" : `Fund ${formatPrice(amount)}`}
    </Button>
  );
}
