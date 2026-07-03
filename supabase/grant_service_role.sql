-- Fixes "permission denied for table X" when using the service role key
-- (e.g. scripts/create-test-users.mjs). service_role bypasses RLS but, like
-- anon/authenticated, still needs an explicit table-level GRANT for tables
-- created via the SQL editor rather than the Table Editor UI. Safe to re-run.

grant select, insert, update, delete on
  faculties,
  profiles,
  profile_faculties,
  flows,
  flow_steps,
  step_completions,
  step_notes,
  flow_members,
  reminder_log,
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
  milestone_sign_offs,
  blackout_weeks,
  settings
to service_role;
