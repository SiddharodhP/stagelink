import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { RateTable } from "@/lib/currency";

const supabase = createBrowserClient();

/**
 * Exchange rates for display-only conversion.
 *
 * World-readable, because a signed-out visitor browsing projects needs
 * them to see an approximate price in their own currency.
 */
export async function getExchangeRates(): Promise<RateTable> {
  const { data } = await supabase
    .from("exchange_rates")
    .select("code, rate_per_usd");

  const table: RateTable = {};
  for (const r of (data || []) as { code: string; rate_per_usd: number }[]) {
    table[r.code] = Number(r.rate_per_usd);
  }
  return table;
}
