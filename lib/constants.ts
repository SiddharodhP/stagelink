import { formatPrice } from '@/lib/utils';

/** The wordmark: the logo, page titles, metadata and the legal footer. */
export const APP_NAME = 'jayree.io';
/**
 * The same brand as an ordinary word, for running prose. A lowercase
 * domain cannot open a sentence, so copy uses this and only the wordmark
 * carries the .io.
 */
export const BRAND_NAME = 'Jayree';
export const APP_DESCRIPTION =
  'The freelance marketplace where clients structure work into milestones, freelancers compete on merit, and every payment is protected by escrow.';

export const NAV_LINKS = [
  { label: 'Find people', href: '/people' },
  { label: 'Browse projects', href: '/projects' },
  { label: 'Discover', href: '/discover' },
  { label: 'How it works', href: '/#how-it-works' },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry level', hint: 'New talent, budget-friendly' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Solid track record' },
  { value: 'expert', label: 'Expert', hint: 'Deep specialist experience' },
] as const;

export const LOCATION_PREFS = [
  { value: 'remote', label: 'Remote' },
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
] as const;

export const DURATION_OPTIONS = [
  'Less than 1 week',
  '1–2 weeks',
  '2–4 weeks',
  '1–3 months',
  '3–6 months',
  'More than 6 months',
] as const;

/**
 * Budget filter brackets, as bounds only.
 *
 * The labels used to be written out with a currency sign in them, which meant
 * the platform could change currency -- as it did, twice -- and these four
 * strings would keep quietly saying dollars. They are built from the bounds by
 * budgetPresetLabel instead, so there is one place that decides how money is
 * written and these cannot drift from it.
 */
export const BUDGET_PRESETS = [
  { min: null, max: null },
  { min: null, max: 5_000 },
  { min: 5_000, max: 25_000 },
  { min: 25_000, max: 1_00_000 },
  { min: 1_00_000, max: null },
] as const;

/** Reads a bracket the way a person would say it: 'Under Rs 5,000'. */
export function budgetPresetLabel(preset: { min: number | null; max: number | null }) {
  const { min, max } = preset;
  if (min === null && max === null) return 'Any budget';
  if (min === null) return `Under ${formatPrice(max!)}`;
  if (max === null) return `${formatPrice(min)}+`;
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

export const PROJECT_SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'budget_desc', label: 'Highest budget' },
  { value: 'budget_asc', label: 'Lowest budget' },
  { value: 'deadline', label: 'Earliest deadline' },
  { value: 'fewest_bids', label: 'Fewest bids' },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Available for work' },
  { value: 'limited', label: 'Limited availability' },
  { value: 'unavailable', label: 'Not available' },
] as const;

/** Fallback list shown before the categories table loads. */
export const CATEGORY_FALLBACK = [
  'Photography', 'Videography', 'Video Editing & Post',
  'Photo Editing & Retouching', 'Motion Graphics & Animation', 'Drone & Aerial',
] as const;

export const MILESTONE_STATUS_LABELS: Record<string, string> = {
  pending: 'Awaiting funding',
  in_progress: 'In progress',
  submitted: 'Under review',
  revision_requested: 'Revision requested',
  approved: 'Approved',
  paid: 'Paid',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
};

export const BID_STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  shortlisted: 'Shortlisted',
  accepted: 'Accepted',
  rejected: 'Not selected',
  withdrawn: 'Withdrawn',
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  pending_acceptance: 'Awaiting freelancer confirmation',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};
