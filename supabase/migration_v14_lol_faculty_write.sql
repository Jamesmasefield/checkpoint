-- Checkpoint V14 — LoLs can add teaching staff to their faculty
-- profile_faculties previously only allowed writes via is_admin() (see
-- add_multi_faculty.sql), so the "Faculty memberships" checkboxes on the
-- Staff page silently no-op'd (blocked by RLS) whenever a LoL clicked them.
-- This adds a second write policy so a LoL/Assistant LoL can add or remove
-- a *teacher* to/from a faculty they themselves belong to. They still can't
-- touch faculty membership for admins/other LoLs, or for faculties outside
-- their own — that stays admin-only via the existing profile_faculties_admin_write
-- policy (policies are OR'd together by Postgres RLS).
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
