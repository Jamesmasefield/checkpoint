create table if not exists action_log (
  id          uuid        primary key default gen_random_uuid(),
  actor_id    uuid        references profiles(id) on delete set null,
  actor_name  text,
  actor_email text,
  action      text        not null,
  entity_type text,
  entity_id   text,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists action_log_created_at_idx on action_log (created_at desc);
create index if not exists action_log_actor_id_idx   on action_log (actor_id);

alter table action_log enable row level security;

-- Admins can read all entries
create policy "admins_read_action_log"
  on action_log for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Any authenticated user can insert their own action entries
create policy "auth_users_insert_action_log"
  on action_log for insert
  with check (
    auth.uid() is not null
    and (actor_id is null or actor_id = auth.uid())
  );
