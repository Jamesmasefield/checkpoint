-- Follow-ups requested after the first cut of the TaskDetailPanel
-- (Build Order step 10). Safe to re-run.

-- 1. Notes become a proper table instead of a single text field: one row
--    per note, timestamped, with an author, individually deletable.
--    Supersedes flow_steps.lol_notes added moments earlier this session.
create table if not exists step_notes (
  id uuid primary key default gen_random_uuid(),
  step_id uuid references flow_steps(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz default now()
);

alter table step_notes enable row level security;

grant select, insert, update, delete on step_notes to authenticated;

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

alter table flow_steps drop column if exists lol_notes;

-- 2. Per-step draft text for the eventual reminder email (Build Order
--    step 15-17 build the actual sending; this just captures the message
--    body ahead of that so it's ready to use once wired up).
alter table flow_steps add column if not exists reminder_email_body text;

-- 3. Removing a step (new "Remove step" button) must not fail if a
--    reminder was already logged against it — preserve the audit trail
--    (don't cascade-delete the log row) but let the step_id go null.
alter table reminder_log drop constraint if exists reminder_log_step_id_fkey;
alter table reminder_log add constraint reminder_log_step_id_fkey
  foreign key (step_id) references flow_steps(id) on delete set null;
