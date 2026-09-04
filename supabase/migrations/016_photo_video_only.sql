-- ============================================================
-- NARROW THE MARKETPLACE TO PHOTO, VIDEO AND EDITING
--
-- Roster started as a musician-booking site, became a general freelance
-- marketplace, and is now only for photographers, videographers and
-- editors. The taxonomy still carried all three eras: Web Development
-- sitting next to Photography, and skills like React, Bookkeeping and
-- Contract Drafting alongside Colour Grading.
--
-- A marketplace is judged by its narrowest useful promise. "Hire a wedding
-- photographer in Pune" is a promise; "hire anyone for anything" from a
-- site with three profiles is not. Everything out of scope goes.
--
-- DESTRUCTIVE. This deletes the two existing test projects and everything
-- hanging off them, which the owner asked for explicitly after being shown
-- what cascades:
--
--   projects -> milestones, bids, contracts, project_attachments,
--               saved_projects, transactions
--   contracts -> milestone_submissions, reviews, invoices,
--                recurring_invoices, disputes
--
-- Conversations survive: conversations.project_id is ON DELETE SET NULL,
-- so message threads and call history are kept.
--
-- Run AFTER 015_call_liveness.sql.
-- ============================================================

begin;

-- ---------- 1. Clear out-of-scope work ----------

-- Named explicitly rather than "delete everything": a blanket delete would
-- also take any in-scope project added between writing and running this.
delete from public.projects
 where category_id in (
   select id from public.categories
    where slug not in (
      'photography', 'videography', 'video-editing',
      'photo-editing', 'motion-graphics', 'drone-aerial'
    )
 );

-- ---------- 2. Categories ----------

insert into public.categories (name, slug) values
  ('Photography', 'photography'),
  ('Videography', 'videography'),
  ('Video Editing & Post', 'video-editing'),
  ('Photo Editing & Retouching', 'photo-editing'),
  ('Motion Graphics & Animation', 'motion-graphics'),
  ('Drone & Aerial', 'drone-aerial')
on conflict (slug) do update set name = excluded.name;

-- Anything still referenced cannot be removed — the FK is RESTRICT, which
-- is the correct default here. Deleting only unreferenced rows means this
-- migration can never silently destroy live work.
delete from public.categories
 where slug not in (
   'photography', 'videography', 'video-editing',
   'photo-editing', 'motion-graphics', 'drone-aerial'
 )
   and not exists (
     select 1 from public.projects p where p.category_id = categories.id
   );

-- ---------- 3. Skills ----------

delete from public.skills;

insert into public.skills (name) values
  -- Photography
  ('Wedding Photography'), ('Event Photography'), ('Portrait Photography'),
  ('Product Photography'), ('Fashion Photography'), ('Food Photography'),
  ('Real Estate Photography'), ('Architectural Photography'),
  ('Travel Photography'), ('Sports Photography'), ('Newborn Photography'),
  ('Maternity Photography'), ('Corporate Headshots'), ('Jewellery Photography'),
  ('Automotive Photography'), ('Concert Photography'),
  ('Documentary Photography'), ('Street Photography'),
  -- Videography
  ('Wedding Videography'), ('Event Videography'), ('Corporate Video'),
  ('Commercial & Ad Films'), ('Music Videos'), ('Documentary Filmmaking'),
  ('Real Estate Video'), ('Product Video'), ('Social Media Reels'),
  ('YouTube Content'), ('Livestream Production'), ('Interview Filming'),
  -- On-set craft
  ('Cinematography'), ('Camera Operation'), ('Lighting'),
  ('Gimbal Operation'), ('Drone & Aerial'), ('Multi-Cam Setup'),
  ('Sound Recording'), ('Studio Setup'), ('Directing'), ('Storyboarding'),
  ('Production Assistance'),
  -- Post
  ('Video Editing'), ('Photo Retouching'), ('Colour Grading'),
  ('Colour Correction'), ('Motion Graphics'), ('2D Animation'),
  ('3D Animation'), ('VFX & Compositing'), ('Subtitling'),
  ('Audio Post-Production'), ('Album Design'), ('Photo Culling'),
  -- Tools
  ('Adobe Premiere Pro'), ('Final Cut Pro'), ('DaVinci Resolve'),
  ('Adobe After Effects'), ('Adobe Photoshop'), ('Adobe Lightroom'),
  ('Capture One'), ('Blender'), ('Cinema 4D'), ('CapCut')
on conflict (name) do nothing;

-- ---------- 4. Strip skills nobody can pick any more ----------

/**
 * profiles.skills is a text[], not a foreign key, so it still holds
 * whatever was chosen under the old taxonomy — leaving photographers
 * tagged "Bollywood, Rock, Metal" on their directory cards.
 *
 * Keeping only skills that still exist drops completeness for those
 * profiles, which is the honest signal: they now genuinely have no skills
 * listed, and the meter should say so rather than counting stale tags.
 */
update public.profiles p
   set skills = coalesce(
     (
       select array_agg(s)
         from unnest(p.skills) as s
        where exists (select 1 from public.skills k where k.name = s)
     ),
     '{}'::text[]
   )
 where p.skills is not null and array_length(p.skills, 1) > 0;

-- Same for projects that survived.
update public.projects p
   set skills = coalesce(
     (
       select array_agg(s)
         from unnest(p.skills) as s
        where exists (select 1 from public.skills k where k.name = s)
     ),
     '{}'::text[]
   )
 where p.skills is not null and array_length(p.skills, 1) > 0;

-- Completeness is trigger-maintained, but the update above changed skills
-- underneath it for rows the trigger may not have fired on.
update public.profiles
   set completeness = public.compute_profile_completeness(id);

commit;

-- ============================================================
-- VERIFY
--   select name, slug from public.categories order by id;   -- 6 rows
--   select count(*) from public.skills;                     -- ~62
--   select count(*) from public.projects;                   -- 0
--   select full_name, skills, completeness from public.profiles
--    where role = 'freelancer';
--
--   -- conversations must have survived with project_id nulled:
--   select id, project_id from public.conversations;
-- ============================================================
