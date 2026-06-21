-- One-time bootstrap: turns the already-authenticated user
-- mneve@stedwards.nsw.edu.au into the first Admin profile.
-- Safe to re-run.

insert into profiles (id, full_name, email, role, faculty_id)
select
  id,
  'Mitchell Neve',
  email,
  'admin',
  null
from auth.users
where email = 'mneve@stedwards.nsw.edu.au'
on conflict (id) do update
  set role = 'admin';

select id, full_name, email, role, faculty_id from profiles where email = 'mneve@stedwards.nsw.edu.au';
