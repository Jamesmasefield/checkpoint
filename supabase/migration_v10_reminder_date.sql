-- Checkpoint V10 — Per-milestone reminder date
-- Adds reminder_date so organizers can schedule the auto-reminder email
-- earlier than the due date. NULL means "use due_date" (same as before).
-- Safe to re-run: uses IF NOT EXISTS.

alter table flow_milestones
  add column if not exists reminder_date date;
