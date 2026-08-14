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
  is_verified: boolean;
  is_suspended: boolean;
  created_at: string;
  // joined aggregates (optional)
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
