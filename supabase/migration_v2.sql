-- Checkpoint V2 database migration
-- Run in the Supabase SQL editor (Build Order step 1).
-- Creates all new tables, enables RLS, applies policies, updates the role
-- constraint, and migrates existing role values.
-- Safe to re-run: tables use IF NOT EXISTS, policies are DROP/CREATE.
-- ==========================================================================


-- ==========================================================================
-- SECTION 1: NEW TABLES
-- (in FK-dependency order so every reference already exists)
-- ==========================================================================

-- Subjects (within a faculty)
create table if not exists subjects (
  id          uuid primary key default gen_random_uuid(),
  faculty_id  uuid not null references faculties(id) on delete cascade,
  name        text not null,
  created_at  timestamptz default now()
);

-- Which LoLs are responsible for a subject (many-to-many)
create table if not exists subject_lols (
  subject_id  uuid references subjects(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  primary key (subject_id, user_id)
);

-- Which teachers are on a subject's staff roster (many-to-many)
create table if not exists subject_staff (
  subject_id  uuid references subjects(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  primary key (subject_id, user_id)
);

-- Courses (year-level grouping within a subject, e.g. "Year 11 Modern History")
create table if not exists courses (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references subjects(id) on delete cascade,
  name        text not null,
  year_level  int  not null check (year_level between 7 and 12),
  created_at  timestamptz default now()
);

-- Classes (specific class groups within a course, e.g. "11MH1")
create table if not exists classes (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references courses(id) on delete cascade,
  code        text not null,
  name        text,
  created_at  timestamptz default now()
);

-- Which teachers are assigned to a class (many-to-many)
create table if not exists class_teachers (
  class_id    uuid references classes(id) on delete cascade,
  user_id     uuid references profiles(id) on delete cascade,
  primary key (class_id, user_id)
);

-- Reusable milestone workflow templates.
-- faculty_id = null means the template is school-wide (available to all faculties).
-- subject_id retained for potential future subject-scoped templates.
create table if not exists templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  faculty_id    uuid references faculties(id) on delete set null,
  subject_id    uuid references subjects(id) on delete set null,
  template_type text check (template_type in ('rubric', 'comment')),
  created_by    uuid references profiles(id),
  created_at    timestamptz default now()
);

-- Individual milestone steps within a template.
-- offset_days: negative = before assessment_date, positive = after.
-- assignee_mode: who is responsible for this milestone.
-- recipient_mode: who receives the reminder email.
-- is_reporting_due: flags the post-assessment results deadline for the countdown.
create table if not exists template_milestones (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid not null references templates(id) on delete cascade,
  title           text not null,
  description     text,
  offset_days     int  not null default 0,
  assignee_mode   text check (assignee_mode in ('organiser', 'class_teachers', 'lol')),
  recipient_mode  text check (recipient_mode in ('assignee_only', 'assignee_and_lol')),
  is_reporting_due boolean default false,
  sort_order      int  not null default 0
);

-- Which classes are attached to an assessment flow (many-to-many).
create table if not exists flow_classes (
  flow_id   uuid references flows(id) on delete cascade,
  class_id  uuid references classes(id) on delete cascade,
  primary key (flow_id, class_id)
);

-- Frozen milestone copies attached to a specific flow.
-- Due dates are computed on flow creation (offset + blackout resolver) and
-- stored here so the LoL can override individual dates without affecting the template.
-- Completion state is embedded (not a separate table) for simpler queries.
create table if not exists flow_milestones (
  id               uuid primary key default gen_random_uuid(),
  flow_id          uuid not null references flows(id) on delete cascade,
  title            text not null,
  description      text,
  due_date         date,
  assignee_mode    text check (assignee_mode in ('organiser', 'class_teachers', 'lol')),
  recipient_mode   text check (recipient_mode in ('assignee_only', 'assignee_and_lol')),
  is_reporting_due boolean default false,
  sort_order       int not null default 0,
  is_custom        boolean default false,
  reminder_email_body text,
  completed_by     uuid references profiles(id) on delete set null,
  completed_at     timestamptz,
  notes            text
);

-- Blackout weeks: date ranges during which milestone due dates should not fall.
-- The blackout resolver pushes any date that lands inside a blackout to
-- end_date + 1 day (and propagates the delta to subsequent milestones).
create table if not exists blackout_weeks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  created_at  timestamptz default now()
);

-- Singleton settings row. Only one row is ever allowed (check id = 1).
-- due_soon_days: how many days before a milestone's due_date the "due soon"
-- status activates and the first auto-reminder fires (default: 5).
create table if not exists settings (
  id            int primary key default 1,
  due_soon_days int not null default 5,
  updated_at    timestamptz default now(),
  check (id = 1)
);
-- Seed the single settings row if it doesn't exist yet.
insert into settings (id) values (1) on conflict do nothing;


-- ==========================================================================
-- SECTION 2: CHANGES TO EXISTING TABLES
-- ==========================================================================

-- Add course_id to flows (replaces direct year_level for hierarchy grouping).
-- Nullable so existing flows are not broken before they are assigned a course.
alter table flows
  add column if not exists course_id uuid references courses(id) on delete set null;

-- Add template_id to flows (reference to the template the flow was built from).
-- Nullable because flows created before this migration have no template reference.
alter table flows
  add column if not exists template_id uuid references templates(id) on delete set null;

-- Role migration requires three steps in this exact order:
-- 1. Drop old constraint (so any value is temporarily valid)
-- 2. Migrate existing values (no constraint in the way)
-- 3. Add new constraint (all rows now satisfy it)
alter table profiles drop constraint if exists profiles_role_check;
update profiles set role = 'lol'     where role = 'assistant_lol';
update profiles set role = 'teacher' where role in ('course_delegate', 'classroom_teacher');
alter table profiles
  add constraint profiles_role_check
  check (role in ('admin', 'lol', 'teacher'));

-- Extend reminder_log with email metadata columns for the improved audit log.
-- Keeping the table name as reminder_log (not renaming to email_jobs) for
-- backward compatibility with existing queries and the live Edge Function.
alter table reminder_log add column if not exists email_subject  text;
alter table reminder_log add column if not exists body_preview   text;

-- reminder_log.step_id now also needs to coexist with flow_milestones.
-- Add a nullable FK to flow_milestones; existing rows keep step_id populated.
alter table reminder_log
  add column if not exists flow_milestone_id uuid references flow_milestones(id) on delete set null;


-- ==========================================================================
-- SECTION 3: ENABLE RLS ON ALL NEW TABLES
-- ==========================================================================

alter table subjects          enable row level security;
alter table subject_lols      enable row level security;
alter table subject_staff     enable row level security;
alter table courses           enable row level security;
alter table classes           enable row level security;
alter table class_teachers    enable row level security;
alter table templates         enable row level security;
alter table template_milestones enable row level security;
alter table flow_classes      enable row level security;
alter table flow_milestones   enable row level security;
alter table blackout_weeks    enable row level security;
alter table settings          enable row level security;


-- ==========================================================================
-- SECTION 4: TABLE-LEVEL GRANTS
-- ==========================================================================

grant select, insert, update, delete on
  subjects,
  subject_lols,
  subject_staff,
  courses,
  classes,
  class_teachers,
  templates,
  template_milestones,
  flow_classes,
  flow_milestones,
  blackout_weeks,
  settings
to authenticated, service_role;


-- ==========================================================================
-- SECTION 5: RLS POLICIES
-- ==========================================================================
-- All helper functions (is_admin, is_lol_of_faculty, is_member_of_flow) are
-- already defined in schema.sql as SECURITY DEFINER functions.
-- ==========================================================================


-- ---- subjects ----
-- Readable by all authenticated users (same pattern as faculties — names are
-- not sensitive and are needed across the app for labels and pickers).
-- Writable by LoLs assigned to that faculty and admins.

drop policy if exists "subjects_select" on subjects;
create policy "subjects_select" on subjects
  for select to authenticated
  using (true);

drop policy if exists "subjects_lol_write" on subjects;
create policy "subjects_lol_write" on subjects
  for all to authenticated
  using    (is_lol_of_faculty(faculty_id) or is_admin())
  with check (is_lol_of_faculty(faculty_id) or is_admin());


-- ---- subject_lols ----
-- Readable by all authenticated users.
-- Writable by the LoL of the subject's parent faculty, or admin.

drop policy if exists "subject_lols_select" on subject_lols;
create policy "subject_lols_select" on subject_lols
  for select to authenticated
  using (true);

drop policy if exists "subject_lols_lol_write" on subject_lols;
create policy "subject_lols_lol_write" on subject_lols
  for all to authenticated
  using (
    is_lol_of_faculty((select faculty_id from subjects where id = subject_id))
    or is_admin()
  )
  with check (
    is_lol_of_faculty((select faculty_id from subjects where id = subject_id))
    or is_admin()
  );


-- ---- subject_staff ----

drop policy if exists "subject_staff_select" on subject_staff;
create policy "subject_staff_select" on subject_staff
  for select to authenticated
  using (true);

drop policy if exists "subject_staff_lol_write" on subject_staff;
create policy "subject_staff_lol_write" on subject_staff
  for all to authenticated
  using (
    is_lol_of_faculty((select faculty_id from subjects where id = subject_id))
    or is_admin()
  )
  with check (
    is_lol_of_faculty((select faculty_id from subjects where id = subject_id))
    or is_admin()
  );


-- ---- courses ----

drop policy if exists "courses_select" on courses;
create policy "courses_select" on courses
  for select to authenticated
  using (true);

drop policy if exists "courses_lol_write" on courses;
create policy "courses_lol_write" on courses
  for all to authenticated
  using (
    is_lol_of_faculty((select faculty_id from subjects where id = subject_id))
    or is_admin()
  )
  with check (
    is_lol_of_faculty((select faculty_id from subjects where id = subject_id))
    or is_admin()
  );


-- ---- classes ----

drop policy if exists "classes_select" on classes;
create policy "classes_select" on classes
  for select to authenticated
  using (true);

drop policy if exists "classes_lol_write" on classes;
create policy "classes_lol_write" on classes
  for all to authenticated
  using (
    is_lol_of_faculty(
      (select s.faculty_id from subjects s
       join courses c on c.subject_id = s.id
       where c.id = course_id)
    )
    or is_admin()
  )
  with check (
    is_lol_of_faculty(
      (select s.faculty_id from subjects s
       join courses c on c.subject_id = s.id
       where c.id = course_id)
    )
    or is_admin()
  );


-- ---- class_teachers ----

drop policy if exists "class_teachers_select" on class_teachers;
create policy "class_teachers_select" on class_teachers
  for select to authenticated
  using (true);

drop policy if exists "class_teachers_lol_write" on class_teachers;
create policy "class_teachers_lol_write" on class_teachers
  for all to authenticated
  using (
    is_lol_of_faculty(
      (select s.faculty_id from subjects s
       join courses c  on c.subject_id = s.id
       join classes cl on cl.course_id  = c.id
       where cl.id = class_id)
    )
    or is_admin()
  )
  with check (
    is_lol_of_faculty(
      (select s.faculty_id from subjects s
       join courses c  on c.subject_id = s.id
       join classes cl on cl.course_id  = c.id
       where cl.id = class_id)
    )
    or is_admin()
  );


-- ---- templates ----
-- School-wide templates (subject_id IS NULL) are readable and writable by any
-- LoL or admin. Subject-specific templates are writable by the LoL of that
-- subject's faculty, or the LoL who created the template, or admin.

drop policy if exists "templates_select" on templates;
create policy "templates_select" on templates
  for select to authenticated
  using (true);

drop policy if exists "templates_lol_write" on templates;
create policy "templates_lol_write" on templates
  for all to authenticated
  using (
    created_by = auth.uid()
    or is_lol_of_faculty(faculty_id)
    or is_admin()
  )
  with check (
    created_by = auth.uid()
    or is_lol_of_faculty(faculty_id)
    or is_admin()
  );


-- ---- template_milestones ----

drop policy if exists "template_milestones_select" on template_milestones;
create policy "template_milestones_select" on template_milestones
  for select to authenticated
  using (true);

drop policy if exists "template_milestones_lol_write" on template_milestones;
create policy "template_milestones_lol_write" on template_milestones
  for all to authenticated
  using (
    (select created_by from templates where id = template_id) = auth.uid()
    or is_lol_of_faculty(
         (select s.faculty_id from subjects s
          join templates t on t.subject_id = s.id
          where t.id = template_id)
       )
    or is_admin()
  )
  with check (
    (select created_by from templates where id = template_id) = auth.uid()
    or is_lol_of_faculty(
         (select s.faculty_id from subjects s
          join templates t on t.subject_id = s.id
          where t.id = template_id)
       )
    or is_admin()
  );


-- ---- flow_classes ----

drop policy if exists "flow_classes_select" on flow_classes;
create policy "flow_classes_select" on flow_classes
  for select to authenticated
  using (
    is_member_of_flow(flow_id)
    or is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  );

drop policy if exists "flow_classes_lol_write" on flow_classes;
create policy "flow_classes_lol_write" on flow_classes
  for all to authenticated
  using (
    is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or (select created_by from flows where id = flow_id) = auth.uid()
    or is_admin()
  )
  with check (
    is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or (select created_by from flows where id = flow_id) = auth.uid()
    or is_admin()
  );


-- ---- flow_milestones ----
-- SELECT: any flow member, LoL of the flow's faculty, or admin.
-- UPDATE: any flow member may update (application enforces which fields they
--         may change — teachers can only toggle completion, LoLs can edit all).
--         RLS does not restrict per-column; the UI enforces the distinction.
-- INSERT/DELETE: LoL of the faculty or admin only (for custom milestones).

drop policy if exists "flow_milestones_select" on flow_milestones;
create policy "flow_milestones_select" on flow_milestones
  for select to authenticated
  using (
    is_member_of_flow(flow_id)
    or is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  );

drop policy if exists "flow_milestones_member_update" on flow_milestones;
create policy "flow_milestones_member_update" on flow_milestones
  for update to authenticated
  using (
    is_member_of_flow(flow_id)
    or is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  )
  with check (
    is_member_of_flow(flow_id)
    or is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  );

drop policy if exists "flow_milestones_lol_insert_delete" on flow_milestones;
create policy "flow_milestones_lol_insert_delete" on flow_milestones
  for insert to authenticated
  with check (
    is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  );

drop policy if exists "flow_milestones_lol_delete" on flow_milestones;
create policy "flow_milestones_lol_delete" on flow_milestones
  for delete to authenticated
  using (
    is_lol_of_faculty((select faculty_id from flows where id = flow_id))
    or is_admin()
  );


-- ---- blackout_weeks ----

drop policy if exists "blackout_weeks_select" on blackout_weeks;
create policy "blackout_weeks_select" on blackout_weeks
  for select to authenticated
  using (true);

drop policy if exists "blackout_weeks_admin_write" on blackout_weeks;
create policy "blackout_weeks_admin_write" on blackout_weeks
  for all to authenticated
  using    (is_admin())
  with check (is_admin());


-- ---- settings ----

drop policy if exists "settings_select" on settings;
create policy "settings_select" on settings
  for select to authenticated
  using (true);

drop policy if exists "settings_admin_write" on settings;
create policy "settings_admin_write" on settings
  for all to authenticated
  using    (is_admin())
  with check (is_admin());


-- ==========================================================================
-- SECTION 6: VERIFICATION QUERIES
-- Run these after the migration to confirm everything was created correctly.
-- ==========================================================================

-- List all new tables:
-- select table_name from information_schema.tables
-- where table_schema = 'public'
-- and table_name in (
--   'subjects','subject_lols','subject_staff','courses','classes',
--   'class_teachers','templates','template_milestones','flow_classes',
--   'flow_milestones','blackout_weeks','settings'
-- )
-- order by table_name;

-- Check role values after migration (should only show admin, lol, teacher, or null):
-- select distinct role from profiles;

-- Confirm settings singleton:
-- select * from settings;
