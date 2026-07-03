-- Checkpoint V5 — Per-milestone reminder email opt-out
-- Adds a reminders_enabled flag to flow_milestones so admins/LoLs can turn
-- off reminder emails (both the nightly auto-sweep and manual "send now")
-- for individual steps that don't need one.
--
-- Safe to re-run: uses IF NOT EXISTS.
-- ==========================================================================

alter table flow_milestones
  add column if not exists reminders_enabled boolean not null default true;
