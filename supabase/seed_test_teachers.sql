-- Temporary test data: sample classroom teachers for sign-off testing
-- These are fake accounts created solely to test the multi-teacher sign-off
-- flow in milestone_sign_offs. Delete when testing is complete.
--
-- Run in the Supabase SQL editor (requires service role / superuser access).
-- Safe to re-run: uses ON CONFLICT DO NOTHING throughout.
-- ==========================================================================

-- Fixed UUIDs so the script is idempotent and easy to clean up later.
-- Teacher 1
insert into auth.users (
  id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role
)
values (
  'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
  'teacher.sarah.chen@test.checkpoint',
  '$2a$10$placeholder.hash.not.used.for.login',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Sarah Chen"}',
  'authenticated', 'authenticated'
)
on conflict (id) do nothing;

-- Teacher 2
insert into auth.users (
  id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role
)
values (
  'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
  'teacher.james.okonkwo@test.checkpoint',
  '$2a$10$placeholder.hash.not.used.for.login',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"James Okonkwo"}',
  'authenticated', 'authenticated'
)
on conflict (id) do nothing;

-- Teacher 3
insert into auth.users (
  id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role
)
values (
  'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
  'teacher.priya.sharma@test.checkpoint',
  '$2a$10$placeholder.hash.not.used.for.login',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Priya Sharma"}',
  'authenticated', 'authenticated'
)
on conflict (id) do nothing;

-- Teacher 4
insert into auth.users (
  id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  aud, role
)
values (
  'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa',
  'teacher.luca.rossi@test.checkpoint',
  '$2a$10$placeholder.hash.not.used.for.login',
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Luca Rossi"}',
  'authenticated', 'authenticated'
)
on conflict (id) do nothing;


-- ==========================================================================
-- Profiles (the trigger will fire on insert above, but we upsert here to
-- guarantee full_name and role are set even if the trigger already ran)
-- ==========================================================================

insert into profiles (id, full_name, email, role)
values
  ('aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', 'Sarah Chen',    'teacher.sarah.chen@test.checkpoint',    'teacher'),
  ('aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', 'James Okonkwo', 'teacher.james.okonkwo@test.checkpoint', 'teacher'),
  ('aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', 'Priya Sharma',  'teacher.priya.sharma@test.checkpoint',  'teacher'),
  ('aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', 'Luca Rossi',    'teacher.luca.rossi@test.checkpoint',    'teacher')
on conflict (id) do update
  set full_name = excluded.full_name,
      email     = excluded.email,
      role      = excluded.role;


-- ==========================================================================
-- Faculty membership (Mathematics, matching the existing test flow)
-- ==========================================================================

insert into profile_faculties (profile_id, faculty_id)
values
  ('aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111')
on conflict do nothing;


-- ==========================================================================
-- Verify
-- ==========================================================================

select id, full_name, role, email
from profiles
where id in (
  'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
  'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
  'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
  'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa'
)
order by full_name;
