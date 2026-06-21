-- Schema gap found while building the TaskDetailPanel (Build Order step 10):
-- BRIEF.md's Flow Detail View spec calls for an "LoL notes field" on each
-- task, but the given schema's only `notes` column lives on
-- step_completions — tied to a specific completion event, not the task
-- itself. A LoL needs to be able to leave a note on a step before it's
-- completed too, so this adds one nullable column to flow_steps.
-- Governed by the same flow_steps_lol_write RLS policy already in place
-- (LoL/Assistant LoL of the flow's faculty, or admin) — no RLS changes needed.
-- Safe to re-run.

alter table flow_steps add column if not exists lol_notes text;
