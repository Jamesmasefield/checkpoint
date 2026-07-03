-- Checkpoint V3 — Multi-teacher sign-off migration
-- Adds per-teacher sign-off tracking to flow milestones so that milestones
-- assigned to class_teachers can require EVERY teacher to check in before
-- the milestone is considered fully complete.
--
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS patterns throughout.
-- Run after migration_v2.sql and seed_v2_templates.sql.
-- ==========================================================================


-- ==========================================================================
-- SECTION 1: class_count ON FLOWS
-- ==========================================================================

-- How many classes are sitting this assessment. Used by the multi-sign-off
-- system to determine when all teachers have checked in.
alter table flows
  add column if not exists class_count int not null default 1;


-- ==========================================================================
-- SECTION 2: FLAG COLUMNS ON EXISTING MILESTONE TABLES
-- ==========================================================================

-- Marks a milestone as requiring sign-off from ALL assigned class teachers
-- (rather than a single tick-off from any one person).
alter table template_milestones
  add column if not exists requires_all_teachers boolean not null default false;

alter table flow_milestones
  add column if not exists requires_all_teachers boolean not null default false;


-- ==========================================================================
-- SECTION 2: SIGN-OFFS JUNCTION TABLE
-- ==========================================================================

-- One row per (milestone, teacher) pair. When every class teacher assigned
-- to the flow has a row here the application marks flow_milestones.completed_at.
create table if not exists milestone_sign_offs (
  flow_milestone_id uuid    not null references flow_milestones(id) on delete cascade,
  user_id           uuid    not null references profiles(id)        on delete cascade,
  signed_at         timestamptz not null default now(),
  primary key (flow_milestone_id, user_id)
);


-- ==========================================================================
-- SECTION 3: RLS
-- ==========================================================================

alter table milestone_sign_offs enable row level security;

-- SELECT: any flow member, LoL of the flow's faculty, or admin.
drop policy if exists "sign_offs_select" on milestone_sign_offs;
create policy "sign_offs_select" on milestone_sign_offs
  for select to authenticated
  using (
    is_member_of_flow(
      (select flow_id from flow_milestones where id = flow_milestone_id)
    )
    or is_lol_of_faculty(
      (select f.faculty_id from flows f
       join flow_milestones fm on fm.flow_id = f.id
       where fm.id = flow_milestone_id)
    )
    or is_admin()
  );

-- INSERT: authenticated users may insert their OWN sign-off if they are a
-- member of the flow (class teacher), LoL, or admin.
drop policy if exists "sign_offs_insert" on milestone_sign_offs;
create policy "sign_offs_insert" on milestone_sign_offs
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      is_member_of_flow(
        (select flow_id from flow_milestones where id = flow_milestone_id)
      )
      or is_lol_of_faculty(
        (select f.faculty_id from flows f
         join flow_milestones fm on fm.flow_id = f.id
         where fm.id = flow_milestone_id)
      )
      or is_admin()
    )
  );

-- DELETE: users may remove their own sign-off; LoL/admin may remove any.
drop policy if exists "sign_offs_delete" on milestone_sign_offs;
create policy "sign_offs_delete" on milestone_sign_offs
  for delete to authenticated
  using (
    user_id = auth.uid()
    or is_lol_of_faculty(
      (select f.faculty_id from flows f
       join flow_milestones fm on fm.flow_id = f.id
       where fm.id = flow_milestone_id)
    )
    or is_admin()
  );


-- ==========================================================================
-- SECTION 4: TABLE-LEVEL GRANTS
-- ==========================================================================

grant select, insert, update, delete on milestone_sign_offs
  to authenticated, service_role;


-- ==========================================================================
-- SECTION 5: VERIFICATION QUERIES (uncomment to check)
-- ==========================================================================

-- select column_name, data_type
-- from information_schema.columns
-- where table_name in ('template_milestones','flow_milestones')
--   and column_name = 'requires_all_teachers';

-- select table_name, rowsecurity
-- from pg_tables
-- where tablename = 'milestone_sign_offs';
