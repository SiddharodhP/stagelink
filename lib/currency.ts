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
 * Nothing converts, anywhere — not even for display. An amount is shown in
 * the currency it was posted in, and a total spanning currencies is shown
 * as a breakdown rather than a single number: "₹15,000 · A$1,200".
 *
 * That is exact where a converted figure would only ever be approximate,
 * and it removes the daily exchange-rate refresh the previous approach
 * depended on. A conversion that silently goes stale is worse than no
 * conversion at all.
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
  /** Exact per-currency totals. Nothing is converted or merged. */
  breakdown: Record<string, number>;
  /** Codes present, ordered by size so the biggest reads first. */
  currencies: string[];
  isEmpty: boolean;
}

/**
 * Totals amounts, keeping each currency separate.
 *
 * A plain reduce() over `amount` was adding rupees to dollars. Rather than
 * convert — which needs a rate feed, goes stale, and is approximate by
 * nature — this keeps the currencies apart and lets the UI show them side
 * by side. "₹15,000 · A$1,200" is both shorter to compute and exactly true.
 */
export function sumMoney<T>(
  items: T[],
  amountOf: (item: T) => number,
  currencyOf: (item: T) => string | null | undefined,
  fallbackCurrency: string = DEFAULT_CURRENCY
): MoneySum {
  const breakdown: Record<string, number> = {};

  for (const item of items) {
    const code = (currencyOf(item) || fallbackCurrency).toUpperCase();
    breakdown[code] = (breakdown[code] || 0) + (amountOf(item) || 0);
  }

  const currencies = Object.keys(breakdown).sort(
    (a, b) => breakdown[b] - breakdown[a]
  );
  return { breakdown, currencies, isEmpty: currencies.length === 0 };
}

/**
 * "₹15,000 · A$1,200", or just "₹15,000" when there is only one.
 *
 * An empty sum still needs a currency to render zero in, which is what
 * fallbackCurrency is for.
 */
export function formatMoneySum(
  sum: MoneySum,
  fallbackCurrency: string = DEFAULT_CURRENCY
): string {
  if (sum.isEmpty) return formatMoney(0, fallbackCurrency);
  return sum.currencies
    .map((code) => formatMoney(sum.breakdown[code], code))
    .join(" · ");
}

/** Same, from a stored {"INR": 15000, "AUD": 1200} map. */
export function formatCurrencyMap(
  map: Record<string, number> | null | undefined,
  fallbackCurrency: string = DEFAULT_CURRENCY
): string {
  const entries = Object.entries(map || {}).filter(([, v]) => Number(v) > 0);
  if (entries.length === 0) return formatMoney(0, fallbackCurrency);
  return entries
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .map(([code, v]) => formatMoney(Number(v), code))
    .join(" · ");
}

/**
 * Adds and subtracts sums per currency.
 *
 * "Held in escrow" is funded minus released minus refunded, and each of
 * those may span currencies. Doing it per currency keeps the result exact;
 * collapsing to one number first would need a rate and reintroduce the
 * approximation this design removed.
 */
export function netMoney(add: MoneySum[], subtract: MoneySum[] = []): MoneySum {
  const breakdown: Record<string, number> = {};

  for (const sum of add) {
    for (const [code, value] of Object.entries(sum.breakdown)) {
      breakdown[code] = (breakdown[code] || 0) + value;
    }
  }
  for (const sum of subtract) {
    for (const [code, value] of Object.entries(sum.breakdown)) {
      breakdown[code] = (breakdown[code] || 0) - value;
    }
  }

  // A negative balance here means more went out than came in, which for
  // escrow is a bug rather than a number worth showing.
  for (const code of Object.keys(breakdown)) {
    if (breakdown[code] <= 0) delete breakdown[code];
  }

  const currencies = Object.keys(breakdown).sort(
    (a, b) => breakdown[b] - breakdown[a]
  );
  return { breakdown, currencies, isEmpty: currencies.length === 0 };
}

/** Divides each currency by the same factor — for per-milestone averages. */
export function scaleMoney(sum: MoneySum, factor: number): MoneySum {
  if (!factor) return { breakdown: {}, currencies: [], isEmpty: true };
  const breakdown: Record<string, number> = {};
  for (const [code, value] of Object.entries(sum.breakdown)) {
    breakdown[code] = Math.round(value * factor);
  }
  const currencies = Object.keys(breakdown).sort(
    (a, b) => breakdown[b] - breakdown[a]
  );
  return { breakdown, currencies, isEmpty: currencies.length === 0 };
}

/** True when any currency in the sum carries a non-zero amount. */
export function hasMoney(sum: MoneySum): boolean {
  return sum.currencies.some((c) => sum.breakdown[c] > 0);
}
