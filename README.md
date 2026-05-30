# StageLink

A premium full-stack marketplace platform connecting musicians, bands, and DJs with event organizers. Built with a stunning modern aesthetic, featuring glassmorphism, dark themes, and ultra-smooth animations.

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4, Framer Motion
- **UI Components:** shadcn/ui, Radix Primitives
- **Database & Auth:** Supabase (PostgreSQL, Realtime, Storage)
- **State Management:** Zustand
- **Icons:** Lucide React

## Setup Instructions

### 1. Clone & Install
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in your Supabase credentials.
```bash
cp .env.example .env.local
```

### 3. Database Setup (Supabase)
Run the SQL schema located in `supabase/schema.sql` inside your Supabase project's SQL Editor. This will create all 10 tables, Row Level Security (RLS) policies, triggers, and storage buckets.

### 4. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the platform in action.

## Project Structure
- `/app` - Next.js App Router (pages, layouts, api routes)
- `/components` - Reusable UI components (shadcn, layout, shared)
- `/lib/services` - Supabase data access layer
- `/lib/supabase` - Client/Server initialization
- `/store` - Zustand global state management
- `/types` - TypeScript interfaces and types
- `/supabase` - Database schema and configurations

## Features
- **Cinematic UI:** Floating elements, glowing borders, smooth page transitions.
- **Role-Based Auth:** Distinct flows for Musicians and Organizers.
- **Advanced Filtering:** Real-time search by location, genre, budget, and team size.
- **Real-Time Chat:** Built-in messaging between users via Supabase Realtime.
- **Media Gallery:** Portfolio uploads to Supabase Storage.
