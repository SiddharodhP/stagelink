-- ============================================================
-- PHOTO & VIDEO FOCUS
--
-- Adds Photography as a first-class category (the schema only had
-- "Video & Animation") and seeds the skills photographers and
-- videographers actually filter by, so the marketplace can serve that
-- niche properly.
--
-- Idempotent: safe to re-run. Run AFTER 006_invoice_billing_details.sql.
-- ============================================================

begin;

insert into public.categories (name, slug) values
  ('Photography', 'photography')
on conflict (slug) do nothing;

insert into public.skills (name) values
  -- Photography
  ('Photography'),
  ('Portrait Photography'),
  ('Product Photography'),
  ('Wedding Photography'),
  ('Event Photography'),
  ('Real Estate Photography'),
  ('Fashion Photography'),
  ('Food Photography'),
  ('Drone Photography'),
  ('Photo Editing'),
  ('Photo Retouching'),
  ('Adobe Lightroom'),
  ('Adobe Photoshop'),
  -- Videography
  ('Videography'),
  ('Cinematography'),
  ('Event Videography'),
  ('Wedding Videography'),
  ('Corporate Video'),
  ('Drone Videography'),
  ('Colour Grading'),
  ('Adobe Premiere Pro'),
  ('Final Cut Pro'),
  ('DaVinci Resolve'),
  ('Adobe After Effects'),
  ('Sound Design'),
  ('Storyboarding')
on conflict (name) do nothing;

commit;

-- ============================================================
-- VERIFY
--   select name, slug from public.categories order by name;
--   select count(*) from public.skills;
-- ============================================================
