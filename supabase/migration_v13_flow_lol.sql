-- Checkpoint V13 — Explicit LoL selection on flows
-- Previously the LoL for a flow was resolved dynamically at email-send time by
-- matching profiles.role = 'lol' against the flow's faculty_id — ambiguous
-- whenever a faculty has more than one LoL (arbitrary pick via .limit(1)).
-- This adds a stored lol_id so the flow creator picks the specific LoL for
-- that task, used both as the 'lol' recipient and as the {{lol_name}} email
-- signature. Nullable + backward compatible: flows created before this
-- migration keep falling back to the old faculty-wide lookup in the
-- send-reminders edge function.
alter table flows
  add column if not exists lol_id uuid references profiles(id) on delete set null;
