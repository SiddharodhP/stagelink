export const APP_NAME = 'Roster';
export const APP_DESCRIPTION =
  'The freelance marketplace where clients structure work into milestones, freelancers compete on merit, and every payment is protected by escrow.';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

export const BUDGET_PRESETS = [
  { label: 'Any budget', min: null, max: null },
  { label: 'Under $500', min: null, max: 500 },
  { label: '$500 – $2,500', min: 500, max: 2_500 },
  { label: '$2,500 – $10,000', min: 2_500, max: 10_000 },
  { label: '$10,000+', min: 10_000, max: null },
] as const;

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
