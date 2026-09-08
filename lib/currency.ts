/**
 * Multi-currency money.
 *
 * Every amount on this platform is denominated in the currency of the
 * project it belongs to, and stays in it: bids, milestones, escrow,
 * invoices and payouts all settle in what the client posted. Nothing is
 * converted on the way through.
 *
 * That is deliberate. Converting at settlement would mean the value of a
 * signed contract drifts with the exchange rate between agreeing and
 * getting paid — an FX position neither side asked for. Upwork, Fiverr and
 * every payment processor work the same way.
 *
 * Conversion exists only to help someone browsing: "A$1,200 ≈ ₹66,000" is
 * a hint, never a price. convertApprox() is named to make that hard to
 * forget at a call site.
 */

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  /** Locale used for grouping and symbol placement. */
  locale: string;
  /** Currencies with no minor unit — amounts are whole numbers. */
  zeroDecimal?: boolean;
}

/**
 * The currencies offered in pickers, ordered by how likely they are to be
 * wanted. The rate feed covers 166; this is the list worth putting in a
 * dropdown, and anything outside it still formats correctly via Intl.
 */
export const CURRENCIES: CurrencyMeta[] = [
  { code: "AUD", name: "Australian Dollar", symbol: "A$", locale: "en-AU" },
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "€", locale: "de-DE" },
  { code: "GBP", name: "British Pound", symbol: "£", locale: "en-GB" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", locale: "en-IN" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", locale: "en-CA" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", locale: "en-NZ" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", locale: "en-SG" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", locale: "ar-AE" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", locale: "ja-JP", zeroDecimal: true },
  { code: "CNY", name: "Chinese Yuan", symbol: "CN¥", locale: "zh-CN" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", locale: "en-HK" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", locale: "de-CH" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", locale: "sv-SE" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", locale: "nb-NO" },
  { code: "DKK", name: "Danish Krone", symbol: "kr", locale: "da-DK" },
  { code: "ZAR", name: "South African Rand", symbol: "R", locale: "en-ZA" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", locale: "pt-BR" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$", locale: "es-MX" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", locale: "en-PH" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", locale: "id-ID", zeroDecimal: true },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", locale: "ms-MY" },
  { code: "THB", name: "Thai Baht", symbol: "฿", locale: "th-TH" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫", locale: "vi-VN", zeroDecimal: true },
  { code: "KRW", name: "South Korean Won", symbol: "₩", locale: "ko-KR", zeroDecimal: true },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", locale: "pl-PL" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", locale: "tr-TR" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", locale: "en-NG" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", locale: "en-KE" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", locale: "en-PK" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", locale: "bn-BD" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", locale: "si-LK" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", locale: "ar-SA" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", locale: "he-IL" },
];

export const DEFAULT_CURRENCY = "AUD";

const BY_CODE = new Map(CURRENCIES.map((c) => [c.code, c]));

export function currencyMeta(code?: string | null): CurrencyMeta {
  return (
    BY_CODE.get((code || "").toUpperCase()) ||
    BY_CODE.get(DEFAULT_CURRENCY)!
  );
}

/**
 * Formats an amount in its own currency.
 *
 * Falls back to Intl's own handling for anything outside CURRENCIES, so a
 * currency we do not list still renders correctly rather than showing a
 * bare number.
 */
export function formatMoney(
  amount: number,
  code: string = DEFAULT_CURRENCY,
  opts: { compact?: boolean } = {}
): string {
  const meta = currencyMeta(code);
  const resolved = (code || DEFAULT_CURRENCY).toUpperCase();
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: resolved,
      maximumFractionDigits: 0,
      notation: opts.compact ? "compact" : "standard",
    }).format(amount);
  } catch {
    // Unknown ISO code: show the code rather than pretending it is dollars.
    return `${resolved} ${Math.round(amount).toLocaleString()}`;
  }
}

/** Rates keyed by ISO code, all expressed per 1 USD. */
export type RateTable = Record<string, number>;

/**
 * Converts for DISPLAY ONLY.
 *
 * Named "approx" on purpose: the result is a browsing aid, never a price.
 * Contracts, invoices and payouts always use the original currency, and
 * nothing derived from this should ever be written to the database.
 *
 * Returns null when a rate is missing rather than guessing — a wrong
 * number is worse than no number when it is about money.
 */
export function convertApprox(
  amount: number,
  from: string,
  to: string,
  rates: RateTable | null | undefined
): number | null {
  if (!rates) return null;
  const f = (from || "").toUpperCase();
  const t = (to || "").toUpperCase();
  if (f === t) return amount;

  const fromRate = f === "USD" ? 1 : rates[f];
  const toRate = t === "USD" ? 1 : rates[t];
  if (!fromRate || !toRate) return null;

  return (amount / fromRate) * toRate;
}

/**
 * "A$1,200 ≈ ₹66,000" — the original first, the hint second.
 *
 * Returns just the original when the currencies match or no rate is
 * available, so a missing rate degrades to something still correct.
 */
export function formatWithApprox(
  amount: number,
  from: string,
  viewerCurrency: string | null | undefined,
  rates: RateTable | null | undefined
): string {
  const original = formatMoney(amount, from);
  if (!viewerCurrency || viewerCurrency.toUpperCase() === (from || "").toUpperCase()) {
    return original;
  }
  const converted = convertApprox(amount, from, viewerCurrency, rates);
  if (converted == null) return original;
  return `${original} ≈ ${formatMoney(converted, viewerCurrency)}`;
}

/**
 * Amount in words for the invoice PDF.
 *
 * Indian-family currencies use lakh and crore; everything else uses the
 * short scale. Getting this wrong is not cosmetic — the words line is the
 * legal fallback when the numerals on an invoice are disputed, and
 * "Two Lakh Fifty Thousand" on an AUD invoice would be meaningless.
 */
export function amountInWords(amount: number, code: string = DEFAULT_CURRENCY): string {
  const resolved = (code || DEFAULT_CURRENCY).toUpperCase();
  const indian = ["INR", "PKR", "LKR", "BDT", "NPR"].includes(resolved);
  const meta = currencyMeta(resolved);

  const UNITS = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const TENS = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty",
    "Ninety",
  ];

  const under1000 = (n: number): string => {
    if (n === 0) return "";
    if (n < 20) return UNITS[n];
    if (n < 100) {
      const rest = n % 10;
      return TENS[Math.floor(n / 10)] + (rest ? `-${UNITS[rest]}` : "");
    }
    const rest = n % 100;
    return `${UNITS[Math.floor(n / 100)]} Hundred${rest ? ` and ${under1000(rest)}` : ""}`;
  };

  const whole = Math.floor(Math.abs(amount));
  let words: string;

  if (whole === 0) {
    words = "Zero";
  } else if (indian) {
    const crore = Math.floor(whole / 10_000_000);
    const lakh = Math.floor((whole % 10_000_000) / 100_000);
    const thousand = Math.floor((whole % 100_000) / 1000);
    const rest = whole % 1000;
    words = [
      crore ? `${under1000(crore)} Crore` : "",
      lakh ? `${under1000(lakh)} Lakh` : "",
      thousand ? `${under1000(thousand)} Thousand` : "",
      rest ? under1000(rest) : "",
    ]
      .filter(Boolean)
      .join(" ");
  } else {
    const scale: Array<[number, string]> = [
      [1_000_000_000, "Billion"],
      [1_000_000, "Million"],
      [1_000, "Thousand"],
    ];
    let n = whole;
    const parts: string[] = [];
    for (const [size, name] of scale) {
      if (n >= size) {
        parts.push(`${under1000(Math.floor(n / size))} ${name}`);
        n %= size;
      }
    }
    if (n > 0) parts.push(under1000(n));
    words = parts.join(" ");
  }

  const name = meta.code === resolved ? meta.name : resolved;
  return `${name} ${words} Only`;
}

/* ------------------------------ Aggregates ------------------------------ */

export interface MoneySum {
  /** Converted to the viewer's currency. */
  total: number;
  currency: string;
  /** True when the inputs spanned more than one currency. */
  mixed: boolean;
  /** True when something had to be dropped for want of a rate. */
  incomplete: boolean;
  /** Untouched per-currency totals, for a breakdown tooltip. */
  breakdown: Record<string, number>;
}

/**
 * Adds up amounts that may be in different currencies.
 *
 * Plain reduce() over `amount` was silently adding rupees to dollars. This
 * converts each amount into the viewer's currency before summing, and
 * reports whether it mixed currencies so the UI can mark the result
 * approximate — because it is.
 *
 * Anything with no available rate is EXCLUDED and flagged rather than
 * added raw. Undercounting that says so beats a confident wrong total.
 */
export function sumMoney<T>(
  items: T[],
  amountOf: (item: T) => number,
  currencyOf: (item: T) => string | null | undefined,
  viewerCurrency: string = DEFAULT_CURRENCY,
  rates?: RateTable | null
): MoneySum {
  const breakdown: Record<string, number> = {};
  let total = 0;
  let incomplete = false;

  for (const item of items) {
    const amount = amountOf(item) || 0;
    const code = (currencyOf(item) || viewerCurrency).toUpperCase();
    breakdown[code] = (breakdown[code] || 0) + amount;

    if (code === viewerCurrency.toUpperCase()) {
      total += amount;
      continue;
    }
    const converted = convertApprox(amount, code, viewerCurrency, rates);
    if (converted == null) {
      incomplete = true;
      continue;
    }
    total += converted;
  }

  const codes = Object.keys(breakdown);
  return {
    total,
    currency: viewerCurrency,
    mixed: codes.length > 1,
    incomplete,
    breakdown,
  };
}

/**
 * Renders a MoneySum, prefixed with ≈ when it involved conversion.
 *
 * The prefix is the whole point: a total spanning currencies is an
 * estimate that moves with the exchange rate, and showing it as an exact
 * figure would be a quiet lie.
 */
export function formatMoneySum(sum: MoneySum): string {
  const formatted = formatMoney(sum.total, sum.currency);
  return sum.mixed || sum.incomplete ? `≈ ${formatted}` : formatted;
}
