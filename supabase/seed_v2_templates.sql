-- Checkpoint V2 — Built-in template seed (Build Order step 3)
-- Inserts the two school-wide templates and their milestone definitions
-- using the offset values from BRIEF-V2.md.
--
-- Also adds stage_number to template_milestones and flow_milestones:
-- the FlowPage groups milestones by stage (1–4), but stage_number was
-- omitted from the entity definition in the brief — added here as a fix.
--
-- Safe to re-run: templates are inserted only if they don't already exist
-- (matched by name + subject_id IS NULL). Milestones are deleted and
-- re-inserted for each template on each run to keep them in sync.
-- ==========================================================================


-- ==========================================================================
-- SECTION 1: ADD stage_number COLUMN
-- ==========================================================================

alter table template_milestones
  add column if not exists stage_number int not null default 1;

alter table flow_milestones
  add column if not exists stage_number int not null default 1;

-- requires_all_teachers is added by migration_v3_sign_offs.sql but we guard
-- here too so the seed stays independently re-runnable.
alter table template_milestones
  add column if not exists requires_all_teachers boolean not null default false;

alter table flow_milestones
  add column if not exists requires_all_teachers boolean not null default false;


-- ==========================================================================
-- SECTION 2: SEED TEMPLATES AND MILESTONES
-- ==========================================================================

do $$
declare
  tmpl_comment uuid;
  tmpl_rubric  uuid;
begin

  -- -------------------------------------------------------------------------
  -- Template A: Comment-based (Non-Rubric)
  -- -------------------------------------------------------------------------

  -- Find the existing school-wide template; insert only if none exists yet.
  select id into tmpl_comment
  from templates
  where name = 'Comment-based (Non-Rubric)' and subject_id is null
  limit 1;

  if tmpl_comment is null then
    insert into templates (name, subject_id, template_type, created_by)
    values ('Comment-based (Non-Rubric)', null, 'comment', null)
    returning id into tmpl_comment;
  end if;

  -- Wipe and re-seed milestones so re-runs stay in sync with the brief.
  delete from template_milestones where template_id = tmpl_comment;

  insert into template_milestones
    (template_id, stage_number, title, offset_days, assignee_mode, recipient_mode, is_reporting_due, requires_all_teachers, sort_order)
  values
    -- Stage 1 — Task Creation
    (tmpl_comment, 1, 'Create assignment (NoA) in Canvas using correct stage template and naming conventions',                         -21, 'organiser',      'assignee_and_lol', false, false,  10),
    (tmpl_comment, 1, 'Confirm NoA title matches the agreed naming convention (Canvas + Compass)',                                     -21, 'organiser',      'assignee_and_lol', false, false,  20),
    (tmpl_comment, 1, 'Confirm Sync to SIS is enabled in Canvas',                                                                     -21, 'organiser',      'assignee_and_lol', false, false,  30),
    -- Confirmation only — any one teacher can verify
    (tmpl_comment, 1, 'Confirm Canvas NoA due date matches online Assessment Handbook',                                               -21, 'class_teachers', 'assignee_and_lol', false, false,  40),
    (tmpl_comment, 1, 'LoL checks NoA for consistency, wording, structure, and outcome alignment; approve for publication',           -14, 'lol',            'assignee_only',    false, false,  50),
    -- Stage 2 — Platform Setup
    (tmpl_comment, 2, 'Pull From Canvas; set Task Visible for students and parents; check Currently Enrolled Students',               -14, 'organiser',      'assignee_and_lol', false, false,  60),
    (tmpl_comment, 2, 'Create Learning Task for task results in Compass using 1–5 Section Assessment Task templates',                 -10, 'lol',            'assignee_only',    false, false,  70),
    (tmpl_comment, 2, 'Set up Reporting tab in Compass and link to relevant reporting cycles',                                        -10, 'lol',            'assignee_only',    false, false,  80),
    -- Stage 3 — Submission & Marking (each teacher must action their own class)
    (tmpl_comment, 3, 'Record submission status in Compass on the day of the task',                                                     0, 'class_teachers', 'assignee_and_lol', false, true,   90),
    (tmpl_comment, 3, 'Set and communicate faculty marking and feedback deadline',                                                      1, 'lol',            'assignee_only',    false, false, 100),
    (tmpl_comment, 3, 'Ensure all results are complete and entered in the Learning Task by the marking deadline',                      14, 'class_teachers', 'assignee_and_lol', false, true,  110),
    (tmpl_comment, 3, 'Check Compass for missing or incomplete results and follow up',                                                 16, 'lol',            'assignee_only',    false, false, 120),
    -- Stage 4 — Comments & Publishing (each teacher must action their own class)
    (tmpl_comment, 4, 'Apply standardised comments for every student (including late penalties, misadventures, estimates)',            18, 'class_teachers', 'assignee_and_lol', false, true,  130),
    (tmpl_comment, 4, 'Attach generalised marker''s feedback in the Learning Task (formal examination blocks)',                        18, 'organiser',      'assignee_and_lol', false, false, 140),
    (tmpl_comment, 4, 'Check all comments are complete',                                                                              20, 'lol',            'assignee_only',    false, false, 150),
    (tmpl_comment, 4, 'Enable Grading Visible in Compass; confirm marks, grades, and comments are visible before release',            21, 'lol',            'assignee_only',    true,  false, 160);


  -- -------------------------------------------------------------------------
  -- Template B: Rubric-based (Canvas)
  -- -------------------------------------------------------------------------

  select id into tmpl_rubric
  from templates
  where name = 'Rubric-based (Canvas)' and subject_id is null
  limit 1;

  if tmpl_rubric is null then
    insert into templates (name, subject_id, template_type, created_by)
    values ('Rubric-based (Canvas)', null, 'rubric', null)
    returning id into tmpl_rubric;
  end if;

  delete from template_milestones where template_id = tmpl_rubric;

  insert into template_milestones
    (template_id, stage_number, title, offset_days, assignee_mode, recipient_mode, is_reporting_due, requires_all_teachers, sort_order)
  values
    -- Stage 1 — Task Creation
    (tmpl_rubric, 1, 'Create assignment (NoA) in Canvas using correct stage template and naming conventions',                          -21, 'organiser',      'assignee_and_lol', false, false,  10),
    (tmpl_rubric, 1, 'Confirm NoA title matches the agreed naming convention (Canvas + Compass)',                                      -21, 'organiser',      'assignee_and_lol', false, false,  20),
    (tmpl_rubric, 1, 'Set Display Mark as Letter Grade and ensure the grading scheme is set to St Edwards (STED)',                    -21, 'organiser',      'assignee_and_lol', false, false,  30),
    (tmpl_rubric, 1, 'Confirm Sync to SIS is enabled in Canvas',                                                                      -21, 'organiser',      'assignee_and_lol', false, false,  40),
    -- Confirmation only — any one teacher can verify
    (tmpl_rubric, 1, 'Confirm assessment due date matches online Assessment Handbook',                                                 -21, 'class_teachers', 'assignee_and_lol', false, false,  50),
    (tmpl_rubric, 1, 'Build rubric in Canvas (Common Grading Scale or Marks-based) with skill-based descriptors and improvement cues',-18, 'organiser',      'assignee_and_lol', false, false,  60),
    (tmpl_rubric, 1, 'LoL checks rubric for consistency, wording, structure, and outcome alignment; approve for publication',         -14, 'lol',            'assignee_only',    false, false,  70),
    -- Stage 2 — Platform Setup
    (tmpl_rubric, 2, 'Pull From Canvas; set Task Visible for students and parents; check Currently Enrolled Students',                -14, 'organiser',      'assignee_and_lol', false, false,  80),
    (tmpl_rubric, 2, 'Paste contact teacher statement at top of the NoA in Compass',                                                  -12, 'organiser',      'assignee_and_lol', false, false,  90),
    (tmpl_rubric, 2, 'Add AT% and AT? Rank components to the Learning Task (Y11–12)',                                                 -10, 'lol',            'assignee_only',    false, false, 100),
    (tmpl_rubric, 2, 'Set up Reporting tab in Compass and link to relevant reporting cycles',                                         -10, 'lol',            'assignee_only',    false, false, 110),
    -- Stage 3 — Submission & Marking (each teacher must action their own class)
    (tmpl_rubric, 3, 'Record submission status in Compass on the day of the task',                                                      0, 'class_teachers', 'assignee_and_lol', false, true,  120),
    (tmpl_rubric, 3, 'Set and communicate faculty marking and rubric completion deadlines',                                             1, 'lol',            'assignee_only',    false, false, 130),
    (tmpl_rubric, 3, 'Mark using the Canvas rubric within 3 weeks',                                                                   14, 'class_teachers', 'assignee_and_lol', false, true,  140),
    (tmpl_rubric, 3, 'Ensure all results and rubrics are complete; Pull From Canvas again in Compass',                                18, 'lol',            'assignee_only',    false, false, 150),
    (tmpl_rubric, 3, 'Check Compass for missing or incomplete results or rubrics and follow up',                                      19, 'lol',            'assignee_only',    false, false, 160),
    -- Stage 4 — Comments & Publishing
    (tmpl_rubric, 4, 'Enable Grading Visible in Compass; confirm marks, grades, and rubrics are visible before release',              21, 'lol',            'assignee_only',    true,  false, 170);

end $$;


-- ==========================================================================
-- SECTION 3: VERIFICATION QUERIES
-- Uncomment and run to confirm the seed completed correctly.
-- ==========================================================================

-- select t.name, t.template_type, count(tm.id) as milestone_count
-- from templates t
-- left join template_milestones tm on tm.template_id = t.id
-- where t.subject_id is null
-- group by t.id, t.name, t.template_type
-- order by t.name;

-- select tm.stage_number, tm.sort_order, tm.title, tm.offset_days, tm.assignee_mode, tm.is_reporting_due
-- from template_milestones tm
-- join templates t on t.id = tm.template_id
-- where t.name = 'Comment-based (Non-Rubric)'
-- order by tm.sort_order;

-- select tm.stage_number, tm.sort_order, tm.title, tm.offset_days, tm.assignee_mode, tm.is_reporting_due
-- from template_milestones tm
-- join templates t on t.id = tm.template_id
-- where t.name = 'Rubric-based (Canvas)'
-- order by tm.sort_order;
