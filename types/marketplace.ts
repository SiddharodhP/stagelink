export type MarketplaceRole = "client" | "freelancer" | "admin";
export type ProjectStatus =
  | "draft" | "open" | "awarded" | "in_progress" | "completed" | "cancelled";
export type ExperienceLevel = "entry" | "intermediate" | "expert";
export type LocationPref = "remote" | "onsite" | "hybrid";
export type BidStatus =
  | "submitted" | "shortlisted" | "accepted" | "rejected" | "withdrawn";
export type ContractStatus =
  | "pending_acceptance" | "active" | "completed" | "cancelled" | "declined";
export type MilestoneStatus =
  | "pending" | "in_progress" | "submitted" | "revision_requested"
  | "approved" | "paid" | "disputed" | "cancelled";
export type TransactionType = "escrow_fund" | "release" | "refund";
export type TransactionStatus = "pending" | "completed" | "failed";
export type DisputeStatus = "open" | "under_review" | "resolved";
export type Availability = "available" | "limited" | "unavailable";

export interface City {
  id: number;
  name: string;
  state: string | null;
  country: string;
  /** ISO 3166-1 alpha-2. Cities are worldwide as of migration 012. */
  country_code?: string | null;
  slug: string;
  is_metro: boolean;
  population?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

/** Directory filters. `role` decides which side of the marketplace is listed. */
export interface PeopleFilters {
  role: "freelancer" | "client";
  q?: string;
  city?: string;
  skill?: string;
  minRating?: number;
  maxRate?: number;
  availability?: Availability | "";
  remoteOnly?: boolean;
  verifiedOnly?: boolean;
  sort?: "relevance" | "rating" | "rate_asc" | "rate_desc" | "newest";
}

export interface Profile {
  id: string;
  role: MarketplaceRole | null;
  full_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  company_name: string | null;
  website: string | null;
  hourly_rate: number | null;
  experience_years: number;
  availability: Availability;
  skills: string[];
  // Structured location (migration 011). `location` is kept as the free-text
  // label people typed; `city` is what the directory actually filters on.
  city?: string | null;
  state?: string | null;
  country?: string | null;
  works_remotely?: boolean;
  travel_radius_km?: number | null;
  /** 0-100, maintained by DB trigger. See compute_profile_completeness. */
  completeness?: number;
  // Billing fields are NOT selectable by anon/authenticated (migration 011).
  // They arrive only via getMyBilling(), never on a public profile read.
  billing_address?: string | null;
  billing_email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  tax_id_label?: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  created_at: string;
  // Denormalised aggregates, maintained by DB triggers (migration 003).
  // Optional because narrow `select` projections may omit them.
  avg_rating?: number;
  total_reviews?: number;
  total_earned?: number;
  total_spent?: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string;
  category_id: number | null;
  skills: string[];
  experience_level: ExperienceLevel;
  location_pref: LocationPref;
  expected_duration: string | null;
  deadline: string | null;
  budget_total: number;
  status: ProjectStatus;
  bids_count: number;
  published_at: string | null;
  created_at: string;
  // joins
  client?: Profile;
  category?: Category;
  milestones?: Milestone[];
  attachments?: ProjectAttachment[];
}

export interface ProjectAttachment {
  id: string;
  project_id: string;
  file_url: string;
  file_name: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  seq: number;
  title: string;
  description: string | null;
  deliverables: string | null;
  amount: number;
  due_date: string | null;
  status: MilestoneStatus;
  escrow_funded: boolean;
  revision_note: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  auto_release_at: string | null;
}

export interface Bid {
  id: string;
  project_id: string;
  freelancer_id: string;
  amount: number;
  proposal: string;
  delivery_days: number;
  status: BidStatus;
  created_at: string;
  // joins
  freelancer?: Profile;
  project?: Project;
}

export interface Contract {
  id: string;
  project_id: string;
  bid_id: string;
  client_id: string;
  freelancer_id: string;
  agreed_amount: number;
  status: ContractStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  // joins
  project?: Project;
  client?: Profile;
  freelancer?: Profile;
  bid?: Bid;
}

export interface MilestoneSubmission {
  id: string;
  milestone_id: string;
  contract_id: string;
  freelancer_id: string;
  note: string;
  attachment_url: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  project_id: string;
  contract_id: string | null;
  milestone_id: string | null;
  payer_id: string;
  payee_id: string | null;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  reference: string;
  created_at: string;
  project?: { title: string };
  milestone?: { title: string };
}

export interface Review {
  id: string;
  contract_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  reviewer?: Profile;
}

export interface Conversation {
  id: string;
  project_id: string | null;
  participant_1: string;
  participant_2: string;
  created_at: string;
  other?: Profile;
  project?: { title: string } | null;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PortfolioItem {
  id: string;
  freelancer_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  skills: string[];
  created_at: string;
}

export interface Dispute {
  id: string;
  contract_id: string;
  milestone_id: string;
  raised_by: string;
  reason: string;
  details: string | null;
  status: DisputeStatus;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
  milestone?: { title: string; amount: number };
  raiser?: Profile;
  contract?: Contract;
}

export interface ProjectFilters {
  search: string;
  categoryId: number | null;
  skills: string[];
  budgetMin: number | null;
  budgetMax: number | null;
  experienceLevel: ExperienceLevel | "";
  maxBids: number | null;
  sortBy: "newest" | "budget_desc" | "budget_asc" | "deadline" | "fewest_bids";
  page: number;
}

export type CallStatus = "ringing" | "active" | "ended" | "declined" | "missed";

/** A video call between the two people on a conversation (migration 014). */
export interface CallSession {
  id: string;
  conversation_id: string;
  caller_id: string;
  callee_id: string;
  /** Derived from the conversation id. Access is gated by the JaaS JWT. */
  room_name: string;
  status: CallStatus;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export type InvoiceStatus = "sent" | "acknowledged" | "paid" | "cancelled";

export type InvoiceKind = "milestone" | "recurring";

export type RecurrenceCadence = "weekly" | "fortnightly" | "monthly";

export type RecurrenceStatus =
  | "pending_approval"
  | "active"
  | "paused"
  | "declined"
  | "ended";

/** A retainer: the schedule that issues invoices, not an invoice itself. */
export interface RecurringInvoice {
  id: string;
  contract_id: string;
  project_id: string;
  freelancer_id: string;
  client_id: string;
  title: string;
  description: string | null;
  amount: number;
  tax_percent: number;
  currency: string;
  cadence: RecurrenceCadence;
  payment_terms_days: number;
  starts_on: string;
  next_run_on: string;
  ends_on: string | null;
  max_occurrences: number | null;
  occurrences_created: number;
  status: RecurrenceStatus;
  approved_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
  // joins
  freelancer?: Profile;
  client?: Profile;
  project?: Project;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  /** Null on retainer invoices — they bill a period, not a milestone. */
  milestone_id: string | null;
  contract_id: string;
  project_id: string;
  freelancer_id: string;
  client_id: string;
  amount: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  notes: string | null;
  milestone_title: string;
  project_title: string;
  due_date: string | null;
  issued_at: string;
  acknowledged_at: string | null;
  paid_at: string | null;
  created_at: string;
  // Billing snapshot, captured at issue time (migration 006)
  from_name?: string | null;
  from_address?: string | null;
  from_email?: string | null;
  from_phone?: string | null;
  from_tax_id?: string | null;
  from_tax_label?: string | null;
  to_name?: string | null;
  to_address?: string | null;
  to_email?: string | null;
  to_phone?: string | null;
  to_tax_id?: string | null;
  to_tax_label?: string | null;
  deliverables?: string | null;
  milestone_seq?: number | null;
  milestone_count?: number | null;
  payment_terms?: string | null;
  reference?: string | null;
  // Recurrence (migration 009)
  kind?: InvoiceKind;
  recurring_invoice_id?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  reminders_sent?: number;
  last_reminder_at?: string | null;
  // joins
  freelancer?: Profile;
  client?: Profile;
}
