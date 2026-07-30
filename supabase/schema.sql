-- Checkpoint database schema
-- Run this in the Supabase SQL editor (Build Order step 4)
-- Safe to re-run: tables use IF NOT EXISTS, policies are dropped and recreated.

-- Faculties
create table if not exists faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Users (extends Supabase auth.users)
-- faculty_id removed (Build Order step 18 follow-up): a person's faculty
-- affiliation is many-to-many via profile_faculties below, not a single
-- column — e.g. a LoL covering two faculties at once. See BRIEF-UPDATES.md.
create table if not exists profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  email text,
  role text check (role in ('admin', 'lol', 'assistant_lol', 'course_delegate', 'classroom_teacher')),
  created_at timestamptz default now()
);

-- Which faculties a person belongs to (many-to-many).
create table if not exists profile_faculties (
  profile_id uuid references profiles(id) on delete cascade,
  faculty_id uuid references faculties(id) on delete cascade,
  primary key (profile_id, faculty_id)
);

-- Added during Build Order step 18 (AdminPage): auto-create a bare profile
-- whenever someone signs up, so admins can find and assign a role to them.
-- See BRIEF-UPDATES.md.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Assessment flows
create table if not exists flows (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  faculty_id uuid references faculties(id),
  template_type text check (template_type in ('rubric', 'comment')),
  year_level text not null check (year_level in ('7', '8', '9', '10', '11', '12')),
  anchor_date date not null,
  created_by uuid references profiles(id),
  status text default 'draft' check (status in ('draft', 'active', 'complete')),
  imported_from uuid references flows(id),
  created_at timestamptz default now()
);

-- Flow steps
create table if not exists flow_steps (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid references flows(id) on delete cascade,
  stage_number int not null,
  step_number text not null,
  description text not null,
  default_role text,
  assigned_to uuid references profiles(id),
  due_date date,
  is_custom boolean default false,
  sort_order int,
  created_at timestamptz default now()
);

-- Added during Build Order step 10 (TaskDetailPanel): per-step draft text
-- for the eventual reminder email (Build Order step 15-17 build the actual
-- sending). See BRIEF-UPDATES.md.
alter table flow_steps add column if not exists reminder_email_body text;

-- Step completions
create table if not exists step_completions (
  id uuid primary key default gen_random_uuid(),
  step_id uuid references flow_steps(id) on delete cascade,
  completed_by uuid references profiles(id),
  completed_at timestamptz default now(),
  notes text
);

-- Step notes (LoL commentary on a task, independent of completion).
-- Originally a single `lol_notes` text column on flow_steps (Build Order
-- step 10 first pass); replaced with a proper table so notes are
-- timestamped, attributable, and individually deletable. See BRIEF-UPDATES.md.
create table if not exists step_notes (
  id uuid primary key default gen_random_uuid(),
  step_id uuid references flow_steps(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz default now()
);

-- Flow members (who is tagged into which flow)
create table if not exists flow_members (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid references flows(id) on delete cascade,
  user_id uuid references profiles(id),
  role_in_flow text,
  added_at timestamptz default now()
);

-- Email reminder log
create table if not exists reminder_log (
  id uuid primary key default gen_random_uuid(),
  step_id uuid references flow_steps(id),
  recipient_id uuid references profiles(id),
  lol_id uuid references profiles(id),
  sent_at timestamptz default now(),
  trigger_type text check (trigger_type in ('auto', 'manual')),
  days_before int
);

-- Added during Build Order step 10: removing a step (new "Remove step"
-- button) must not fail with a foreign key error if a reminder was already
-- logged against it. Preserve the audit trail row but let step_id go null
-- rather than cascading the delete. See BRIEF-UPDATES.md.
alter table reminder_log drop constraint if exists reminder_log_step_id_fkey;
alter table reminder_log add constraint reminder_log_step_id_fkey
  foreign key (step_id) references flow_steps(id) on delete set null;

-- =========================================================================
-- Row Level Security
-- =========================================================================

-- Helper functions (SECURITY DEFINER so they can read `profiles` without
-- triggering the RLS policies defined on `profiles` itself — avoids recursion).

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_lol_of_faculty(target_faculty uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    join profile_faculties pf on pf.profile_id = p.id
    where p.id = auth.uid()
      and p.role in ('lol', 'assistant_lol')
      and pf.faculty_id = target_faculty
  );
$$;

create or replace function public.is_member_of_flow(target_flow uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from flow_members
    where flow_id = target_flow and user_id = auth.uid()
  );
$$;

-- Enable RLS on every table
alter table faculties enable row level security;
alter table profiles enable row level security;
alter table profile_faculties enable row level security;
alter table flows enable row level security;
alter table flow_steps enable row level security;
alter table step_completions enable row level security;
alter table step_notes enable row level security;
alter table flow_members enable row level security;
alter table reminder_log enable row level security;

-- Base table-level grants. RLS policies filter rows, but the `authenticated`
-- role still needs this grant before any policy is evaluated. Supabase adds
-- this automatically for tables created via the Table Editor UI, but not
-- for tables created via raw SQL (as above), so it must be explicit here.
grant select, insert, update, delete on
  faculties,
  profiles,
  profile_faculties,
  flows,
  flow_steps,
  step_completions,
  step_notes,
  flow_members,
  reminder_log
to authenticated;

-- service_role bypasses RLS but, like authenticated, still needs an
-- explicit grant for tables created via the SQL editor. Needed for admin
-- scripts (e.g. scripts/create-test-users.mjs) that use the service role key.
grant select, insert, update, delete on
  faculties,
  profiles,
  profile_faculties,
  flows,
  flow_steps,
  step_completions,
  step_notes,
  flow_members,
  reminder_log
to service_role;

-- ---- faculties ----
-- Any authenticated user can read the faculty list (needed for nav/labels).
-- Only admins can create/modify/delete faculties.
drop policy if exists "faculties_select" on faculties;
create policy "faculties_select" on faculties
  for select to authenticated
  using (true);

drop policy if exists "faculties_admin_write" on faculties;
create policy "faculties_admin_write" on faculties
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- ---- profiles ----
-- Any authenticated user can read basic staff directory info (names/roles
-- are needed across faculties whenever someone is tagged into a flow).
-- Users may update their own profile; admins have full write access.
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select to authenticated
  using (true);

drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_admin_write" on profiles;
create policy "profiles_admin_write" on profiles
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- ---- profile_faculties ----
-- Readable by anyone (faculty affiliation isn't sensitive). Admins can
-- assign anyone to any faculty; LoLs can additionally add/remove teachers
-- to/from faculties they themselves belong to (see profile_faculties_lol_write).
drop policy if exists "profile_faculties_select" on profile_faculties;
create policy "profile_faculties_select" on profile_faculties
  for select to authenticated
  using (true);

drop policy if exists "profile_faculties_admin_write" on profile_faculties;
create policy "profile_faculties_admin_write" on profile_faculties
  for all to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists "profile_faculties_lol_write" on profile_faculties;
create policy "profile_faculties_lol_write" on profile_faculties
  for all to authenticated
  using (
    is_lol_of_faculty(faculty_id)
    and exists (select 1 from profiles where id = profile_id and role = 'teacher')
  )
  with check (
    is_lol_of_faculty(faculty_id)
    and exists (select 1 from profiles where id = profile_id and role = 'teacher')
  );

-- ---- flows ----
-- Users can read flows they are tagged into; LoLs/Assistant LoLs can read
-- and write all flows within their own faculty; admins have full access.
drop policy if exists "flows_select_member" on flows;
create policy "flows_select_member" on flows
  for select to authenticated
  using (
    is_member_of_flow(id)
    or is_lol_of_faculty(faculty_id)
    or is_admin()
  );

drop policy if exists "flows_lol_write" on flows;
create policy "flows_lol_write" on flows
  for all to authenticated
  using (is_lol_of_faculty(faculty_id) or is_admin())
  with check (is_lol_of_faculty(faculty_id) or is_admin());

-- ---- flow_steps ----
-- Visibility/write rules follow the parent flow's membership and faculty.
drop policy if exists "flow_steps_select" on flow_steps;
create policy "flow_steps_select" on flow_steps
  for select to authenticated
  using (
    is_member_of_flow(flow_id)
    or is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  );

drop policy if exists "flow_steps_lol_write" on flow_steps;
create policy "flow_steps_lol_write" on flow_steps
  for all to authenticated
  using (
    is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  )
  with check (
    is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  );

-- ---- step_completions ----
-- A user may only create/update a completion for a step assigned to them.
-- LoLs/Assistant LoLs of the owning faculty and admins may also manage
-- completions (oversight / correcting on a teacher's behalf).
drop policy if exists "step_completions_select" on step_completions;
create policy "step_completions_select" on step_completions
  for select to authenticated
  using (
    is_member_of_flow((select flow_id from flow_steps where id = step_id))
    or is_lol_of_faculty((select faculty_id from flows where id = (select flow_id from flow_steps where id = step_id)))
    or is_admin()
  );

drop policy if exists "step_completions_assigned_write" on step_completions;
create policy "step_completions_assigned_write" on step_completions
  for all to authenticated
  using (
    (select assigned_to from flow_steps where id = step_id) = auth.uid()
    or is_lol_of_faculty((select faculty_id from flows where id = (select flow_id from flow_steps where id = step_id)))
    or is_admin()
  )
  with check (
    (select assigned_to from flow_steps where id = step_id) = auth.uid()
    or is_lol_of_faculty((select faculty_id from flows where id = (select flow_id from flow_steps where id = step_id)))
    or is_admin()
  );

-- ---- step_notes ----
-- Readable by anyone with visibility into the parent flow; writable only
-- by LoL/Assistant LoL of that faculty or admin (these are LoL notes).
drop policy if exists "step_notes_select" on step_notes;
create policy "step_notes_select" on step_notes
  for select to authenticated
  using (
    is_member_of_flow((select flow_id from flow_steps where id = step_id))
    or is_lol_of_faculty((select faculty_id from flows where id = (select flow_id from flow_steps where id = step_id)))
    or is_admin()
  );

drop policy if exists "step_notes_lol_write" on step_notes;
create policy "step_notes_lol_write" on step_notes
  for all to authenticated
  using (
    is_lol_of_faculty((select faculty_id from flows where id = (select flow_id from flow_steps where id = step_id)))
    or is_admin()
  )
  with check (
    is_lol_of_faculty((select faculty_id from flows where id = (select flow_id from flow_steps where id = step_id)))
    or is_admin()
  );

-- ---- flow_members ----
-- Members can see their own membership rows within a flow; LoLs/admins
-- manage the full roster.
drop policy if exists "flow_members_select" on flow_members;
create policy "flow_members_select" on flow_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or is_member_of_flow(flow_id)
    or is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  );

drop policy if exists "flow_members_lol_write" on flow_members;
create policy "flow_members_lol_write" on flow_members
  for all to authenticated
  using (
    is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  )
  with check (
    is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  );

-- ---- reminder_log ----
-- Visible to the recipient, the LoL of the relevant faculty, and admins.
-- Writes happen via the Edge Function (service role, bypasses RLS) or a
-- LoL manually triggering a reminder from the flow detail view.
drop policy if exists "reminder_log_select" on reminder_log;
create policy "reminder_log_select" on reminder_log
  for select to authenticated
  using (
    recipient_id = auth.uid()
    or is_lol_of_faculty((select faculty_id from flows where id = (select flow_id from flow_steps where id = step_id)))
    or is_admin()
  );

drop policy if exists "reminder_log_lol_insert" on reminder_log;
create policy "reminder_log_lol_insert" on reminder_log
  for insert to authenticated
  with check (
    is_lol_of_faculty((select faculty_id from flows where id = (select flow_id from flow_steps where id = step_id)))
    or is_admin()
  );
