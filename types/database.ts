export type UserRole = 'musician' | 'organizer';
export type InquiryStatus = 'pending' | 'accepted' | 'declined' | 'completed';
export type MediaType = 'image' | 'video' | 'audio';

export interface User {
  id: string;
  email: string;
  role: UserRole | null;
  created_at: string;
}

export interface MusicianProfile {
  id: string;
  user_id: string;
  stage_name: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  genres: string[];
  languages: string[];
  team_size: number;
  starting_price: number;
  years_experience: number;
  instagram_url: string | null;
  youtube_url: string | null;
  spotify_url: string | null;
  profile_image: string | null;
  cover_image: string | null;
  verified: boolean;
  created_at: string;
  avg_rating?: number;
  total_reviews?: number;
}

export interface MusicianMedia {
  id: string;
  musician_id: string;
  type: MediaType;
  media_url: string;
  thumbnail_url: string | null;
  title: string | null;
  created_at: string;
}

export interface Availability {
  id: string;
  musician_id: string;
  available_date: string;
  is_booked: boolean;
}

export interface OrganizerProfile {
  id: string;
  user_id: string;
  company_name: string;
  organizer_name: string;
  phone: string | null;
  city: string;
  created_at: string;
}


export interface Inquiry {
  id: string;
  organizer_id: string;
  musician_id: string;
  message: string;
  proposed_budget: number;
  event_date?: string;
  status: InquiryStatus;
  created_at: string;
  organizer?: OrganizerProfile;
  musician?: MusicianProfile;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  last_message?: Message;
  other_user?: {
    id: string;
    name: string;
    avatar: string | null;
  };
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface Review {
  id: string;
  organizer_id: string;
  musician_id: string;
  rating: number;
  review_text: string;
  created_at: string;
  organizer?: OrganizerProfile;
}

export interface MusicianCardData {
  id: string;
  user_id: string;
  stage_name: string;
  city: string;
  genres: string[];
  starting_price: number;
  profile_image: string | null;
  verified: boolean;
  years_experience: number;
  team_size: number;
  avg_rating: number;
  total_reviews: number;
}

export interface FilterState {
  search: string;
  city: string;
  genres: string[];
  budgetMin: number;
  budgetMax: number;
  teamSize: string;
  languages: string[];
  sortBy: 'price_asc' | 'price_desc' | 'rating' | 'experience' | 'newest';
  page: number;
}
