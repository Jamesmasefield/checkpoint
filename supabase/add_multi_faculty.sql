-- Converts profiles' single faculty_id into a many-to-many relationship
-- via a junction table, so one person (e.g. a LoL covering two faculties)
-- can belong to multiple faculties at once. Found necessary after building
-- the AdminPage (Build Order step 18) — the brief's own role description
-- already implies multi-faculty tagging is expected ("A user may be
-- tagged into multiple flows across multiple faculties simultaneously"),
-- but that only covered per-flow membership, not a person's base faculty
-- affiliation. Safe to re-run.

-- 1. Junction table.
create table if not exists profile_faculties (
  profile_id uuid references profiles(id) on delete cascade,
  faculty_id uuid references faculties(id) on delete cascade,
  primary key (profile_id, faculty_id)
);

alter table profile_faculties enable row level security;

grant select, insert, update, delete on profile_faculties to authenticated, service_role;

drop policy if exists "profile_faculties_select" on profile_faculties;
create policy "profile_faculties_select" on profile_faculties
  for select to authenticated
  using (true);

drop policy if exists "profile_faculties_admin_write" on profile_faculties;
create policy "profile_faculties_admin_write" on profile_faculties
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- 2. Migrate existing single-faculty data into the junction table.
insert into profile_faculties (profile_id, faculty_id)
select id, faculty_id from profiles where faculty_id is not null
on conflict do nothing;

-- 3. Rewrite the RLS helper every "LoL of faculty" policy depends on, to
--    check membership in the junction table instead of profiles.faculty_id
--    equality. Every policy that calls is_lol_of_faculty() picks this up
--    automatically — no other policy needs to change.
create or replace function public.is_lol_of_faculty(target_faculty uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    join profile_faculties pf on pf.profile_id = p.id
    where p.id = auth.uid()
      and p.role in ('lol', 'assistant_lol')
      and pf.faculty_id = target_faculty
  );
$$;

-- 4. Drop the old single-faculty column and the now-unused helper that
--    read it directly (my_faculty_id was defined but never referenced by
--    any policy — only is_lol_of_faculty was).
alter table profiles drop column if exists faculty_id;
drop function if exists public.my_faculty_id();
