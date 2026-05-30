export const APP_NAME = 'StageLink';
export const APP_DESCRIPTION = 'Discover live musicians, bands, DJs, and performers for weddings, college fests, corporate events, and unforgettable nights.';
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const GENRES = [
  'Bollywood', 'Classical', 'Rock', 'Pop', 'Jazz', 'Blues', 'Folk',
  'Hip Hop', 'EDM', 'Sufi', 'Ghazal', 'Carnatic', 'Hindustani',
  'Fusion', 'Indie', 'Metal', 'R&B', 'Country', 'Reggae', 'Punk',
] as const;

export const LANGUAGES = [
  'Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
  'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Sanskrit',
] as const;

export const EVENT_TYPES = [
  'Wedding', 'Corporate Event', 'College Fest', 'Private Party',
  'Concert', 'Festival', 'Birthday', 'Anniversary', 'Club Night',
  'Product Launch', 'Charity Event', 'House Party',
] as const;

export const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Goa',
  'Kochi', 'Indore', 'Bhopal', 'Nagpur', 'Coimbatore', 'Vizag',
] as const;

export const TEAM_SIZES = [
  { label: 'Solo', value: '1' },
  { label: 'Duo', value: '2' },
  { label: 'Trio', value: '3' },
  { label: 'Small Band (4-6)', value: '4-6' },
  { label: 'Full Band (7+)', value: '7+' },
] as const;

export const BUDGET_RANGES = [
  { label: 'Under ₹10,000', min: 0, max: 10000 },
  { label: '₹10,000 - ₹25,000', min: 10000, max: 25000 },
  { label: '₹25,000 - ₹50,000', min: 25000, max: 50000 },
  { label: '₹50,000 - ₹1,00,000', min: 50000, max: 100000 },
  { label: '₹1,00,000 - ₹5,00,000', min: 100000, max: 500000 },
  { label: '₹5,00,000+', min: 500000, max: Infinity },
] as const;

export const NAV_LINKS = [
  { label: 'Explore Artists', href: '/musicians' },
] as const;

export const INQUIRY_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  COMPLETED: 'completed',
} as const;
