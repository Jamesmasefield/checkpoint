-- Adds year level to flows — missing dimension found after user feedback
-- on Build Order step 11 (NewFlowForm). Used for the new year dropdown on
-- flow creation and for grouping the sidebar by faculty then year.
-- Backfills the existing seeded test flow as Year 10 (matches its title)
-- before enforcing NOT NULL. Safe to re-run.

alter table flows add column if not exists year_level text;

update flows set year_level = '10' where year_level is null;

alter table flows alter column year_level set not null;

alter table flows drop constraint if exists flows_year_level_check;
alter table flows add constraint flows_year_level_check
  check (year_level in ('7', '8', '9', '10', '11', '12'));
