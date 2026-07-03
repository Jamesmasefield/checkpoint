-- Checkpoint V4 — Canvas links field on flows
-- Adds a canvas_links jsonb column (array of {title, url} objects) so staff
-- can link to one or more Canvas assignments from the flow's detail page,
-- each shown under a friendly title rather than the raw URL.
--
-- Safe to re-run: uses IF NOT EXISTS / idempotent patterns throughout.
-- ==========================================================================

-- Add the jsonb column (no-op if already present).
alter table flows
  add column if not exists canvas_links jsonb not null default '[]'::jsonb;

-- Migrate from the earlier single-URL column, if present.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'flows'
      and column_name  = 'canvas_url'
  ) then
    update flows
      set canvas_links = jsonb_build_array(jsonb_build_object('title', canvas_url, 'url', canvas_url))
      where canvas_url is not null
        and canvas_links = '[]'::jsonb;
    alter table flows drop column canvas_url;
  end if;
end $$;

-- Migrate from the earlier text[] array column, if present.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'flows'
      and column_name  = 'canvas_urls'
  ) then
    update flows
      set canvas_links = (
        select coalesce(jsonb_agg(jsonb_build_object('title', u, 'url', u)), '[]'::jsonb)
        from unnest(canvas_urls) as u
      )
      where canvas_links = '[]'::jsonb;
    alter table flows drop column canvas_urls;
  end if;
end $$;
