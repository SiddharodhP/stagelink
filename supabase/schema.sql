-- Supabase Schema for StageLink

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ENUMS
create type user_role as enum ('musician', 'organizer');
create type media_type as enum ('image', 'video', 'audio');
create type inquiry_status as enum ('pending', 'accepted', 'declined', 'completed');

-- 1. USERS TABLE
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  role user_role,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for users
alter table public.users enable row level security;
create policy "Users can view their own record." on public.users for select using (auth.uid() = id);
create policy "Users can update their own record." on public.users for update using (auth.uid() = id);
create policy "Anyone can view any user record." on public.users for select using (true);

-- Trigger to create a user record when a new auth user signs up
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. MUSICIAN PROFILES
create table public.musician_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null unique,
  stage_name text not null,
  bio text,
  city text not null,
  state text not null,
  country text default 'India',
  genres text[] not null default '{}',
  languages text[] not null default '{}',
  team_size integer not null default 1,
  starting_price integer not null default 0,
  years_experience integer not null default 0,
  instagram_url text,
  youtube_url text,
  spotify_url text,
  profile_image text,
  cover_image text,
  verified boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for musician_profiles
alter table public.musician_profiles enable row level security;
create policy "Musician profiles are viewable by everyone." on public.musician_profiles for select using (true);
create policy "Users can insert their own musician profile." on public.musician_profiles for insert with check (auth.uid() = user_id);
create policy "Users can update their own musician profile." on public.musician_profiles for update using (auth.uid() = user_id);

-- 3. ORGANIZER PROFILES
create table public.organizer_profiles (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null unique,
  company_name text,
  organizer_name text not null,
  phone text,
  city text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for organizer_profiles
alter table public.organizer_profiles enable row level security;
create policy "Organizer profiles are viewable by everyone." on public.organizer_profiles for select using (true);
create policy "Users can insert their own organizer profile." on public.organizer_profiles for insert with check (auth.uid() = user_id);
create policy "Users can update their own organizer profile." on public.organizer_profiles for update using (auth.uid() = user_id);

-- 4. MUSICIAN MEDIA
create table public.musician_media (
  id uuid default uuid_generate_v4() primary key,
  musician_id uuid references public.musician_profiles(id) on delete cascade not null,
  type media_type not null,
  media_url text not null,
  thumbnail_url text,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for musician_media
alter table public.musician_media enable row level security;
create policy "Media is viewable by everyone." on public.musician_media for select using (true);
create policy "Musicians can insert their own media." on public.musician_media for insert with check (
  auth.uid() in (select user_id from public.musician_profiles where id = musician_id)
);
create policy "Musicians can delete their own media." on public.musician_media for delete using (
  auth.uid() in (select user_id from public.musician_profiles where id = musician_id)
);

-- 5. AVAILABILITY
create table public.availability (
  id uuid default uuid_generate_v4() primary key,
  musician_id uuid references public.musician_profiles(id) on delete cascade not null,
  available_date date not null,
  is_booked boolean default false,
  unique(musician_id, available_date)
);

-- RLS for availability
alter table public.availability enable row level security;
create policy "Availability is viewable by everyone." on public.availability for select using (true);
create policy "Musicians can manage their availability." on public.availability for all using (
  auth.uid() in (select user_id from public.musician_profiles where id = musician_id)
);



-- 7. INQUIRIES
create table public.inquiries (
  id uuid default uuid_generate_v4() primary key,
  organizer_id uuid references public.organizer_profiles(id) on delete cascade not null,
  musician_id uuid references public.musician_profiles(id) on delete cascade not null,
  message text not null,
  proposed_budget integer not null,
  event_date date not null,
  status inquiry_status default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for inquiries
alter table public.inquiries enable row level security;
create policy "Organizers can view their sent inquiries." on public.inquiries for select using (
  auth.uid() in (select user_id from public.organizer_profiles where id = organizer_id)
);
create policy "Musicians can view their received inquiries." on public.inquiries for select using (
  auth.uid() in (select user_id from public.musician_profiles where id = musician_id)
);
create policy "Organizers can insert inquiries." on public.inquiries for insert with check (
  auth.uid() in (select user_id from public.organizer_profiles where id = organizer_id)
);
create policy "Musicians can update inquiry status." on public.inquiries for update using (
  auth.uid() in (select user_id from public.musician_profiles where id = musician_id)
);

-- 8. CONVERSATIONS
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  participant_1 uuid references public.users(id) on delete cascade not null,
  participant_2 uuid references public.users(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(participant_1, participant_2)
);

-- RLS for conversations
alter table public.conversations enable row level security;
create policy "Users can view their conversations." on public.conversations for select using (
  auth.uid() = participant_1 or auth.uid() = participant_2
);
create policy "Users can create conversations." on public.conversations for insert with check (
  auth.uid() = participant_1 or auth.uid() = participant_2
);

-- 9. MESSAGES
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.users(id) on delete cascade not null,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for messages
alter table public.messages enable row level security;
create policy "Users can view messages in their conversations." on public.messages for select using (
  auth.uid() in (
    select participant_1 from public.conversations where id = conversation_id
    union
    select participant_2 from public.conversations where id = conversation_id
  )
);
create policy "Users can send messages to their conversations." on public.messages for insert with check (
  auth.uid() = sender_id and
  auth.uid() in (
    select participant_1 from public.conversations where id = conversation_id
    union
    select participant_2 from public.conversations where id = conversation_id
  )
);
create policy "Users can update read status of messages they received." on public.messages for update using (
  auth.uid() != sender_id and
  auth.uid() in (
    select participant_1 from public.conversations where id = conversation_id
    union
    select participant_2 from public.conversations where id = conversation_id
  )
);

-- 10. REVIEWS
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  organizer_id uuid references public.organizer_profiles(id) on delete cascade not null,
  musician_id uuid references public.musician_profiles(id) on delete cascade not null,
  rating integer check (rating >= 1 and rating <= 5) not null,
  review_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(organizer_id, musician_id)
);

-- RLS for reviews
alter table public.reviews enable row level security;
create policy "Reviews are viewable by everyone." on public.reviews for select using (true);
create policy "Organizers can create reviews." on public.reviews for insert with check (
  auth.uid() in (select user_id from public.organizer_profiles where id = organizer_id)
);
create policy "Organizers can update their reviews." on public.reviews for update using (
  auth.uid() in (select user_id from public.organizer_profiles where id = organizer_id)
);

-- Create a view for Musician average rating to make querying easier
create view public.musician_ratings as
select 
  musician_id,
  round(avg(rating)::numeric, 1) as avg_rating,
  count(id) as total_reviews
from public.reviews
group by musician_id;

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;

-- Storage RLS policies
create policy "Media is publicly accessible." on storage.objects for select using (bucket_id = 'media');
create policy "Authenticated users can upload media." on storage.objects for insert with check (
  bucket_id = 'media' and auth.role() = 'authenticated'
);
create policy "Users can update their own media." on storage.objects for update using (
  bucket_id = 'media' and auth.uid() = owner
);
create policy "Users can delete their own media." on storage.objects for delete using (
  bucket_id = 'media' and auth.uid() = owner
);
