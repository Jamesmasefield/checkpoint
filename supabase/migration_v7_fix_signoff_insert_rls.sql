-- Checkpoint V7 — Allow LoL/admin to sign off on behalf of a teacher
-- The original sign_offs_insert policy (migration_v3_sign_offs.sql) required
-- user_id = auth.uid(), so only a teacher could insert their own sign-off
-- row. The UI already lets an LoL/admin tick any teacher's checkbox
-- (MilestoneDetailPanel's canWrite check), but those inserts were silently
-- rejected by RLS — the row never landed and the checkbox just bounced back
-- unchecked after refetch.
--
-- The matching sign_offs_delete policy already allows LoL/admin to remove
-- any teacher's sign-off; this brings INSERT in line with that.
--
-- Safe to re-run: policy is dropped and recreated.
-- ==========================================================================

drop policy if exists "sign_offs_insert" on milestone_sign_offs;
create policy "sign_offs_insert" on milestone_sign_offs
  for insert to authenticated
  with check (
    (
      user_id = auth.uid()
      and is_member_of_flow(
        (select flow_id from flow_milestones where id = flow_milestone_id)
      )
    )
    or is_lol_of_faculty(
      (select f.faculty_id from flows f
       join flow_milestones fm on fm.flow_id = f.id
       where fm.id = flow_milestone_id)
    )
    or is_admin()
  );
