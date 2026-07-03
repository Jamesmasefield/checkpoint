-- Allow profiles to be deleted without FK violations.
-- Re-creates all FK constraints that reference profiles(id) without an
-- ON DELETE action so they now use SET NULL instead of the default RESTRICT.
-- Safe to re-run (drops each constraint before re-adding it).

-- flows.created_by
alter table flows drop constraint if exists flows_created_by_fkey;
alter table flows add constraint flows_created_by_fkey
  foreign key (created_by) references profiles(id) on delete set null;

-- flow_steps.assigned_to
alter table flow_steps drop constraint if exists flow_steps_assigned_to_fkey;
alter table flow_steps add constraint flow_steps_assigned_to_fkey
  foreign key (assigned_to) references profiles(id) on delete set null;

-- step_completions.completed_by
alter table step_completions drop constraint if exists step_completions_completed_by_fkey;
alter table step_completions add constraint step_completions_completed_by_fkey
  foreign key (completed_by) references profiles(id) on delete set null;

-- step_notes.author_id
alter table step_notes drop constraint if exists step_notes_author_id_fkey;
alter table step_notes add constraint step_notes_author_id_fkey
  foreign key (author_id) references profiles(id) on delete set null;

-- flow_members.user_id
alter table flow_members drop constraint if exists flow_members_user_id_fkey;
alter table flow_members add constraint flow_members_user_id_fkey
  foreign key (user_id) references profiles(id) on delete set null;

-- reminder_log.recipient_id
alter table reminder_log drop constraint if exists reminder_log_recipient_id_fkey;
alter table reminder_log add constraint reminder_log_recipient_id_fkey
  foreign key (recipient_id) references profiles(id) on delete set null;

-- reminder_log.lol_id
alter table reminder_log drop constraint if exists reminder_log_lol_id_fkey;
alter table reminder_log add constraint reminder_log_lol_id_fkey
  foreign key (lol_id) references profiles(id) on delete set null;
