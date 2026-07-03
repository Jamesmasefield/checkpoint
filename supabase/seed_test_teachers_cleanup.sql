-- Cleanup: removes the temporary test teachers added by seed_test_teachers.sql
-- Run this in the Supabase SQL editor once sign-off testing is complete.

delete from flow_members
where user_id in (
  'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
  'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
  'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
  'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa'
);

delete from profile_faculties
where profile_id in (
  'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
  'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
  'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
  'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa'
);

delete from profiles
where id in (
  'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
  'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
  'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
  'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa'
);

delete from auth.users
where id in (
  'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
  'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
  'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
  'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa'
);

-- Confirm removal
select count(*) as remaining_test_teachers
from profiles
where email like '%@test.checkpoint';
