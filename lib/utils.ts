import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  // en-IN groups the Indian way -- 2,50,000, not 250,000 -- which is what
  // amountInWords below has to agree with.
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * The currency symbol alone, for form labels like "Your budget (Rs)".
 *
 * Taken out of the same formatter formatPrice uses rather than typed as a
 * literal, so a label can never end up disagreeing with the amounts rendered
 * next to it -- which is exactly how these labels came to still say dollars
 * after the platform moved to rupees.
 */
export const CURRENCY_SYMBOL =
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value ?? '₹';

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/** Shown wherever someone has no name of their own to show. */
export const UNNAMED = 'Unnamed member';

/**
 * The name to display for a person.
 *
 * profiles.full_name is `not null default ''` — a row exists from the
 * moment someone signs up, before onboarding asks for a name — so an empty
 * string is a state the UI has to handle rather than an edge case. Every
 * display site used to carry its own `|| "..."` fallback, and there were
 * twenty different ones: the same nameless account read as "User" in
 * messages, "Freelancer" in the directory, "Client" on a project card and
 * "Unnamed" in admin. One incomplete profile looked like four people.
 *
 * Trims as well, so a name of only spaces falls through instead of
 * rendering as blank.
 */
export function displayName(
  person: { full_name?: string | null } | null | undefined,
  fallback: string = UNNAMED
): string {
  return person?.full_name?.trim() || fallback;
}

/**
 * Same, for surfaces that address a contracting or billing party rather
 * than a person — a company name wins there when one is set.
 */
export function partyName(
  person:
    | { full_name?: string | null; company_name?: string | null }
    | null
    | undefined,
  fallback: string = UNNAMED
): string {
  return person?.company_name?.trim() || person?.full_name?.trim() || fallback;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return formatDate(date);
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'K';
  }
  return String(n);
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10), o = n % 10;
  return TENS[t] + (o ? ` ${ONES[o]}` : '');
}

function threeDigits(n: number): string {
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/**
 * Amount in words for the invoice PDF, in the Indian scale that goes with
 * rupees: crore / lakh / thousand, not billion / million.
 *
 * This line is the legal fallback when an invoice's numerals are disputed, so
 * it has to agree with the figure beside it. formatPrice groups as 2,50,000,
 * so spelling that "Two Hundred Fifty Thousand" would not match.
 *
 * Indian grouping is not uniform: the last three digits stand alone, and
 * everything above them is read in pairs. That is why this splits off the
 * hundreds first and then walks up in hundreds rather than thousands.
 */
export function amountInWords(amount: number, currency = 'INR'): string {
  const unit = currency === 'INR' ? 'Rupees' : currency;

  const n = Math.floor(Math.abs(amount));
  if (n === 0) return `${unit} Zero Only`;

  const last3 = n % 1000;
  let rest = Math.floor(n / 1000);
  const thousand = rest % 100;
  rest = Math.floor(rest / 100);
  const lakh = rest % 100;
  const crore = Math.floor(rest / 100);

  const parts: string[] = [];
  // Crore is the open-ended one -- 100 crore and up is still crore -- so it
  // takes threeDigits, while lakh and thousand never exceed 99.
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (last3) parts.push(threeDigits(last3));

  return `${unit} ${parts.join(' ')} Only`;
}
