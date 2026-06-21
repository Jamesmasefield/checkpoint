-- Fixes "permission denied for table X" (42501) errors.
-- RLS policies only filter rows; the `authenticated` role still needs a
-- base table-level GRANT before any policy is even evaluated. Supabase
-- adds this automatically when tables are created via the Table Editor UI,
-- but not when created via raw SQL (as schema.sql did). Safe to re-run.

grant select, insert, update, delete on
  faculties,
  profiles,
  flows,
  flow_steps,
  step_completions,
  flow_members,
  reminder_log
to authenticated;
