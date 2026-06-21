-- One-time test data so the Dashboard (Build Order step 8) has something
-- real to render. Uses Template B (Rubric-based). Due dates here are
-- manually approximated from the Deadline Logic table in BRIEF.md against
-- an anchor_date of 2026-06-30 — the real auto-calculation engine comes in
-- Build Order step 12 and will replace this guesswork.
-- Safe to re-run (uses on conflict / delete-then-insert for the steps).

-- Faculty
insert into faculties (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Mathematics')
on conflict (id) do nothing;

-- Flow
insert into flows (id, title, faculty_id, template_type, anchor_date, created_by, status)
select
  '22222222-2222-2222-2222-222222222222',
  'Year 10 Mathematics — Term 2 Assessment',
  '11111111-1111-1111-1111-111111111111',
  'rubric',
  '2026-06-30',
  id,
  'active'
from profiles where email = 'mneve@stedwards.nsw.edu.au'
on conflict (id) do nothing;

-- Tag the test admin as a member so it shows up in the membership-based
-- sidebar/dashboard query (RLS already allows admins to see everything;
-- this row is what makes the client-side query match too).
insert into flow_members (flow_id, user_id, role_in_flow)
select '22222222-2222-2222-2222-222222222222', id, 'lol'
from profiles where email = 'mneve@stedwards.nsw.edu.au'
on conflict do nothing;

-- Steps (Template B, Stages 1-4)
delete from flow_steps where flow_id = '22222222-2222-2222-2222-222222222222';

insert into flow_steps (flow_id, stage_number, step_number, description, default_role, due_date, sort_order) values
('22222222-2222-2222-2222-222222222222', 1, '1', 'Create the assignment (NoA) in Canvas using the correct stage template and naming conventions', 'Course Delegate (LoL oversight)', '2026-06-09', 1),
('22222222-2222-2222-2222-222222222222', 1, '2', 'Confirm task NoA title matches the agreed naming convention (Canvas + Compass)', 'Course Delegate (LoL oversight)', '2026-06-09', 2),
('22222222-2222-2222-2222-222222222222', 1, '3', 'Change Display Mark to Letter Grade and ensure grading scheme is set to St Edwards (STED)', 'Course Delegate', '2026-06-09', 3),
('22222222-2222-2222-2222-222222222222', 1, '4', 'Confirm Sync to SIS is enabled in Canvas', 'Course Delegate', '2026-06-09', 4),
('22222222-2222-2222-2222-222222222222', 1, '5', 'Confirm Canvas assessment due date matches online Assessment Handbook', 'Classroom Teacher / Course Delegate (LoL oversight)', '2026-06-09', 5),
('22222222-2222-2222-2222-222222222222', 1, '6', 'Build the rubric in Canvas, ensuring skill-based descriptors and improvement cues', 'Course Delegate', '2026-06-09', 6),
('22222222-2222-2222-2222-222222222222', 1, '7', 'LoL/Assistant LoL checks rubric for consistency, wording, structure, outcome alignment; approve for publication', 'LoL / Assistant LoL', '2026-06-09', 7),
('22222222-2222-2222-2222-222222222222', 2, '8', 'Before the 2-week NoA window: Pull From Canvas, set Task Visible, check Currently Enrolled Students', 'Course Delegate (LoL oversight)', '2026-06-16', 8),
('22222222-2222-2222-2222-222222222222', 2, '9', 'Paste the contact teacher statement at the top of the NoA in Compass', 'Course Delegate / LoL / Assistant LoL', '2026-06-09', 9),
('22222222-2222-2222-2222-222222222222', 2, '10', 'AT? % and AT? Rank (Y11-12) components added into the synced Learning Task', 'LoL / Assistant LoL', '2026-06-09', 10),
('22222222-2222-2222-2222-222222222222', 2, '11', 'Set up the Reporting tab, linking the task to the relevant reporting cycle', 'LoL / Assistant LoL', '2026-06-09', 11),
('22222222-2222-2222-2222-222222222222', 3, '12', 'On the day of the task, record in Compass if student has/has not handed in or sat assessment', 'Classroom Teacher', '2026-06-30', 12),
('22222222-2222-2222-2222-222222222222', 3, '13', 'Set and communicate faculty marking and rubric completion deadlines', 'LoL', '2026-07-14', 13),
('22222222-2222-2222-2222-222222222222', 3, '14', 'Mark using the Canvas rubric within 3 weeks', 'Classroom Teacher', '2026-07-21', 14),
('22222222-2222-2222-2222-222222222222', 3, '15', 'Within 3 weeks: ensure all results and rubrics are complete, Pull From Canvas again', 'LoL / Assistant LoL', '2026-07-21', 15),
('22222222-2222-2222-2222-222222222222', 3, '16', 'Prior to deadline: check Compass for missing/incomplete results or rubrics and follow up', 'LoL / Assistant LoL', '2026-07-18', 16),
('22222222-2222-2222-2222-222222222222', 4, '17', 'Enable Grading Visible to students and parents before release', 'LoL / Delegate', '2026-07-21', 17);

-- Mark Stage 1's setup steps as already completed, to give the progress
-- bar / stat cards something other than zero to show.
insert into step_completions (step_id, completed_by, notes)
select fs.id, p.id, 'Seed test data'
from flow_steps fs
join profiles p on p.email = 'mneve@stedwards.nsw.edu.au'
where fs.flow_id = '22222222-2222-2222-2222-222222222222'
  and fs.step_number in ('1', '2', '3', '4');

select title, status, anchor_date from flows where id = '22222222-2222-2222-2222-222222222222';
