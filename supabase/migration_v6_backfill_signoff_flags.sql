-- Checkpoint V6 — Backfill stale requires_all_teachers flags
-- flow_milestones are a frozen copy taken from template_milestones at flow
-- creation time, so any flow created before a template's
-- requires_all_teachers flag was set (or changed) is stuck on the old value
-- forever — the per-teacher sign-off checklist in MilestoneDetailPanel never
-- appears for those milestones even though the template now says it should.
--
-- This re-syncs requires_all_teachers on existing, non-custom flow_milestones
-- from their originating template_milestones row (matched via the flow's
-- template_id + milestone title + stage_number).
--
-- Safe to re-run: only updates rows whose value actually differs.
-- ==========================================================================

update flow_milestones fm
set requires_all_teachers = tm.requires_all_teachers
from flows f
join template_milestones tm
  on tm.template_id = f.template_id
where fm.flow_id = f.id
  and tm.title = fm.title
  and tm.stage_number = fm.stage_number
  and fm.is_custom = false
  and fm.requires_all_teachers is distinct from tm.requires_all_teachers;


-- ==========================================================================
-- VERIFICATION — flows where a milestone now requires all-teacher sign-off
-- but no class teachers are tagged to the flow yet (the checklist will show
-- but with no names until teachers are added via the flow's class teacher
-- picker).
-- ==========================================================================

select f.id as flow_id, f.title as flow_title, fm.title as milestone_title
from flow_milestones fm
join flows f on f.id = fm.flow_id
where fm.requires_all_teachers = true
  and not exists (
    select 1 from flow_members mem
    where mem.flow_id = f.id and mem.role_in_flow = 'class_teacher'
  )
order by f.title, fm.sort_order;
