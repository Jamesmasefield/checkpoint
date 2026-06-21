-- Build Order step 18 (AdminPage): nothing currently creates a `profiles`
-- row when someone signs up. A new person logging in via magic link gets
-- an auth.users row but no profile — they'd see "no profile found"
-- forever, and an admin couldn't see them in any list to assign a role,
-- since they'd never appear in the profiles table at all.
--
-- This trigger auto-creates a bare profile (role/faculty_id left null)
-- whenever a new auth.users row is inserted, so admins can find them in
-- the AdminPage and assign a role/faculty. SECURITY DEFINER so it runs
-- with the privileges to write to public.profiles regardless of the
-- inserting context. Safe to re-run.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
