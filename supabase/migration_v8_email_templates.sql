-- Checkpoint V8 — Email template columns
-- Adds default_email_subject and default_email_body to template_milestones so
-- each built-in milestone step ships with a ready-to-send email template.
-- Adds email_subject and email_body to flow_milestones so LoLs can customise
-- per-flow while keeping the template default as the starting value.
-- Safe to re-run: all ALTER TABLEs use IF NOT EXISTS.

alter table template_milestones
  add column if not exists default_email_subject text,
  add column if not exists default_email_body    text;

alter table flow_milestones
  add column if not exists email_subject text,
  add column if not exists email_body    text;
