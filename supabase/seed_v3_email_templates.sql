-- Checkpoint V3 — Default email templates seed (Build Order step 4)
-- Seeds default_email_subject and default_email_body on every template_milestone
-- in both built-in templates. Re-runnable: uses UPDATE, not INSERT.
-- Run AFTER migration_v8_email_templates.sql and seed_v2_templates.sql.
-- ==========================================================================

do $$
declare
  tmpl_comment uuid;
  tmpl_rubric  uuid;
begin

  select id into tmpl_comment
  from templates
  where name = 'Comment-based (Non-Rubric)' and subject_id is null
  limit 1;

  select id into tmpl_rubric
  from templates
  where name = 'Rubric-based (Canvas)' and subject_id is null
  limit 1;

  if tmpl_comment is null then
    raise exception 'Template "Comment-based (Non-Rubric)" not found — run seed_v2_templates.sql first.';
  end if;
  if tmpl_rubric is null then
    raise exception 'Template "Rubric-based (Canvas)" not found — run seed_v2_templates.sql first.';
  end if;


  -- =========================================================================
  -- TEMPLATE A: Comment-based (Non-Rubric)
  -- =========================================================================

  -- S1 sort 10 — Create assignment (NoA) in Canvas
  update template_milestones set
    default_email_subject = 'Action required — Create NoA in Canvas | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
This is a reminder that the Notice of Assessment (NoA) for {{assessment_title}} ({{course_name}}) needs to be created in Canvas by {{step_due_date}}.
Please ensure you are using the correct stage template, that all key sections are completed, and that the due date is set correctly.
You can view this step in Checkpoint here: {{checkpoint_link}}
If you have any questions, please get in touch.
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 10;

  -- S1 sort 20 — Confirm NoA title matches naming convention
  update template_milestones set
    default_email_subject = 'Action required — Confirm NoA title | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
A quick reminder to confirm that the NoA title for {{assessment_title}} ({{course_name}}) matches the agreed naming convention in both Canvas and Compass. This step is due by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 20;

  -- S1 sort 30 — Confirm Sync to SIS is enabled in Canvas
  update template_milestones set
    default_email_subject = 'Action required — Confirm Sync to SIS | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please confirm that Sync to SIS is enabled in Canvas for {{assessment_title}} ({{course_name}}) by {{step_due_date}}. This ensures results flow correctly through to Compass.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 30;

  -- S1 sort 40 — Confirm Canvas NoA due date matches Assessment Handbook
  update template_milestones set
    default_email_subject = 'Action required — Confirm NoA due date | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please check that the due date entered in Canvas for {{assessment_title}} ({{course_name}}) matches the date listed in the online Assessment Handbook. This needs to be confirmed by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 40;

  -- S1 sort 50 — LoL checks NoA for consistency and approves for publication
  update template_milestones set
    default_email_subject = 'Action required — NoA review and approval | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
The NoA for {{assessment_title}} ({{course_name}}) is ready for your review. Please check it for consistency, wording, structure, and outcome alignment, and approve it for publication by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 50;

  -- S2 sort 60 — Pull From Canvas; set Task Visible; check enrolled students
  update template_milestones set
    default_email_subject = 'Action required — Compass setup | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
The two-week NoA window is approaching for {{assessment_title}} ({{course_name}}). Please complete the following in Compass by {{step_due_date}}:

Pull From Canvas
Set the task as visible to students and parents
Check Currently Enrolled Students and remove any Life Skills students

You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 60;

  -- S2 sort 70 — Create Learning Task in Compass using 1–5 Section templates
  update template_milestones set
    default_email_subject = 'Action required — Create Learning Task in Compass | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please create the Learning Task for {{assessment_title}} ({{course_name}}) in Compass using the 1–5 Section Assessment Task templates. This needs to be completed by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 70;

  -- S2 sort 80 — Set up Reporting tab and link to reporting cycles
  update template_milestones set
    default_email_subject = 'Action required — Set up Reporting tab in Compass | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please set up the Reporting tab in Compass for {{assessment_title}} ({{course_name}}) and link it to the relevant reporting cycles. For Semester 1 tasks, remember to link to both Semester 1 and Semester 2 Reporting Cycles. This needs to be completed by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 80;

  -- S3 sort 90 — Record submission status in Compass on the day of the task
  update template_milestones set
    default_email_subject = 'Action required today — Record submission status | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
A reminder that today is the assessment date for {{assessment_title}} ({{course_name}}). Please record each student''s submission status in the Compass assessment task NoA today, and update it as the situation changes.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 90;

  -- S3 sort 100 — Set and communicate faculty marking and feedback deadline
  update template_milestones set
    default_email_subject = 'Action required — Set marking deadline | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Now that {{assessment_title}} ({{course_name}}) has been submitted, please set and communicate the faculty marking and feedback deadline to your team. This should be within three weeks of the assessment date.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 100;

  -- S3 sort 110 — Ensure all results are entered in the Learning Task by the marking deadline
  update template_milestones set
    default_email_subject = 'Action required — Enter results in Compass | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
The marking deadline for {{assessment_title}} ({{course_name}}) is approaching on {{step_due_date}}. Please ensure all results are complete and entered in the Learning Task in Compass by this date.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 110;

  -- S3 sort 120 — Check Compass for missing or incomplete results and follow up
  update template_milestones set
    default_email_subject = 'Action required — Check for missing results | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please check Compass for any missing or incomplete results for {{assessment_title}} ({{course_name}}) and follow up with relevant staff. This needs to be completed by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 120;

  -- S4 sort 130 — Apply standardised comments for every student
  update template_milestones set
    default_email_subject = 'Action required — Apply student comments | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please apply standardised comments for every student in {{assessment_title}} ({{course_name}}) by {{step_due_date}}. This includes students with late penalties, approved misadventures, and estimates. Please do not individualise comments.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 130;

  -- S4 sort 140 — Attach generalised marker's feedback in the Learning Task
  update template_milestones set
    default_email_subject = 'Action required — Attach marker''s feedback | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
For {{assessment_title}} ({{course_name}}), please attach the generalised marker''s feedback to the Learning Task in Compass by {{step_due_date}}. This applies to formal examination blocks.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 140;

  -- S4 sort 150 — Check all comments are complete
  update template_milestones set
    default_email_subject = 'Action required — Final comment check | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please check that all student comments are complete for {{assessment_title}} ({{course_name}}) before the publishing deadline. This needs to be done by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 150;

  -- S4 sort 160 — Enable Grading Visible in Compass
  update template_milestones set
    default_email_subject = 'Action required — Release results | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Results for {{assessment_title}} ({{course_name}}) are due to be released today ({{step_due_date}}). Please enable Grading Visible in Compass and confirm that the raw mark, grade, and comments are all visible to students and parents before releasing. For Year 11–12 tasks, also ensure AT? Rank is set to visible for students and parents.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_comment and sort_order = 160;


  -- =========================================================================
  -- TEMPLATE B: Rubric-based (Canvas)
  -- =========================================================================

  -- S1 sort 10 — Create assignment (NoA) in Canvas
  update template_milestones set
    default_email_subject = 'Action required — Create NoA in Canvas | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
This is a reminder that the Notice of Assessment (NoA) for {{assessment_title}} ({{course_name}}) needs to be created in Canvas by {{step_due_date}}. Please use the correct stage template, complete all key sections, and set the due date.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 10;

  -- S1 sort 20 — Confirm NoA title matches naming convention
  update template_milestones set
    default_email_subject = 'Action required — Confirm NoA title | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please confirm that the NoA title for {{assessment_title}} ({{course_name}}) matches the agreed naming convention in both Canvas and Compass by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 20;

  -- S1 sort 30 — Set Display Mark as Letter Grade; set grading scheme to STED
  update template_milestones set
    default_email_subject = 'Action required — Configure grading settings in Canvas | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please ensure the Display Mark dropdown for {{assessment_title}} ({{course_name}}) is set to Letter Grade in Canvas, and that the grading scheme is set to St Edwards (STED). This needs to be done by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 30;

  -- S1 sort 40 — Confirm Sync to SIS is enabled
  update template_milestones set
    default_email_subject = 'Action required — Confirm Sync to SIS | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please confirm that Sync to SIS is enabled in Canvas for {{assessment_title}} ({{course_name}}) by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 40;

  -- S1 sort 50 — Confirm assessment due date matches Assessment Handbook
  update template_milestones set
    default_email_subject = 'Action required — Confirm assessment due date | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please check that the due date in Canvas for {{assessment_title}} ({{course_name}}) matches the date listed in the online Assessment Handbook. This needs to be confirmed by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 50;

  -- S1 sort 60 — Build rubric in Canvas with skill-based descriptors
  update template_milestones set
    default_email_subject = 'Action required — Build Canvas rubric | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please build the rubric in Canvas for {{assessment_title}} ({{course_name}}) by {{step_due_date}}. Use either the Common Grading Scale or Marks-based approach, and ensure all criteria include skill-based descriptors and improvement cues.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 60;

  -- S1 sort 70 — LoL checks rubric for consistency and approves for publication
  update template_milestones set
    default_email_subject = 'Action required — Rubric review and approval | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
The rubric for {{assessment_title}} ({{course_name}}) is ready for your review. Please check it for consistency, wording, structure, and outcome alignment, and approve it for publication by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 70;

  -- S2 sort 80 — Pull From Canvas; set Task Visible; check enrolled students
  update template_milestones set
    default_email_subject = 'Action required — Compass setup | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
The two-week NoA window is approaching for {{assessment_title}} ({{course_name}}). Please complete the following in Compass by {{step_due_date}}:

Pull From Canvas
Set the task as visible to students and parents
Check Currently Enrolled Students and remove any Life Skills students

You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 80;

  -- S2 sort 90 — Paste contact teacher statement at top of NoA in Compass
  update template_milestones set
    default_email_subject = 'Action required — Add contact teacher statement | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please paste the contact teacher statement at the top of the NoA in Compass for {{assessment_title}} ({{course_name}}) by {{step_due_date}}. This must be done between syncing the NoA and publishing results.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 90;

  -- S2 sort 100 — Add AT% and AT? Rank components to the Learning Task (Y11–12)
  update template_milestones set
    default_email_subject = 'Action required — Add AT components to Learning Task | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please add the AT% and AT? Rank components to the synced Learning Task in Compass for {{assessment_title}} ({{course_name}}) by {{step_due_date}}. This must be completed before staff begin entering results.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 100;

  -- S2 sort 110 — Set up Reporting tab and link to reporting cycles
  update template_milestones set
    default_email_subject = 'Action required — Set up Reporting tab in Compass | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please set up the Reporting tab in Compass for {{assessment_title}} ({{course_name}}) and link it to the relevant reporting cycles by {{step_due_date}}. For Semester 1 tasks, link to both Semester 1 and Semester 2 Reporting Cycles.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 110;

  -- S3 sort 120 — Record submission status in Compass on the day of the task
  update template_milestones set
    default_email_subject = 'Action required today — Record submission status | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Today is the assessment date for {{assessment_title}} ({{course_name}}). Please record each student''s submission status in the Compass assessment task NoA today and update it as the situation changes.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 120;

  -- S3 sort 130 — Set and communicate marking and rubric completion deadlines
  update template_milestones set
    default_email_subject = 'Action required — Set marking and rubric deadlines | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Now that {{assessment_title}} ({{course_name}}) has been submitted, please set and communicate the faculty marking and rubric completion deadlines to your team. These should be within three weeks of the assessment date.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 130;

  -- S3 sort 140 — Mark using the Canvas rubric within 3 weeks
  update template_milestones set
    default_email_subject = 'Action required — Complete rubric marking | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
The marking deadline for {{assessment_title}} ({{course_name}}) is approaching on {{step_due_date}}. Please ensure all marking is completed using the Canvas rubric by this date, minimising free-text comments unless specifically required.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 140;

  -- S3 sort 150 — Ensure all results and rubrics are complete; Pull From Canvas again
  update template_milestones set
    default_email_subject = 'Action required — Verify results and pull from Canvas | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please confirm that all results and rubrics are complete for {{assessment_title}} ({{course_name}}), then perform a second Pull From Canvas in Compass to update marks and rubrics. This needs to be done by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 150;

  -- S3 sort 160 — Check Compass for missing or incomplete results or rubrics
  update template_milestones set
    default_email_subject = 'Action required — Check for missing results or rubrics | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Please check Compass for any missing or incomplete results or rubrics for {{assessment_title}} ({{course_name}}) and follow up with relevant staff. This needs to be completed by {{step_due_date}}.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 160;

  -- S4 sort 170 — Enable Grading Visible in Compass
  update template_milestones set
    default_email_subject = 'Action required — Release results | {{assessment_title}}',
    default_email_body    = 'Hi {{first_name}},
Results for {{assessment_title}} ({{course_name}}) are due to be released today ({{step_due_date}}). Please enable Grading Visible in Compass and confirm that the raw mark, grade, and rubric are all visible to students and parents before releasing. For Year 11–12 tasks, also ensure AT? Rank is set to visible for students and parents.
You can view this step in Checkpoint here: {{checkpoint_link}}
{{lol_name}}
St Edwards Assessment Team'
  where template_id = tmpl_rubric and sort_order = 170;

end $$;


-- ==========================================================================
-- VERIFICATION QUERIES
-- Uncomment and run to confirm the seed completed correctly.
-- ==========================================================================

-- select t.name, tm.sort_order, tm.stage_number,
--        length(tm.default_email_subject) as subj_len,
--        length(tm.default_email_body)    as body_len
-- from template_milestones tm
-- join templates t on t.id = tm.template_id
-- where t.subject_id is null
-- order by t.name, tm.sort_order;
