-- Build Order step 17: nightly cron trigger for the send-reminders Edge
-- Function. Run each numbered block in the SQL editor, in order.
-- Safe to re-run.

-- 1. Enable the extensions needed to schedule jobs and make HTTP calls
--    from inside Postgres.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Store the service role key in Supabase Vault so the cron job can
--    authenticate its call to the Edge Function WITHOUT the key ever
--    appearing in this file or anywhere committed to the repo.
--    Run ONE of these yourself in the SQL editor, substituting your real
--    key (Settings -> API -> service_role) — never paste the real key into
--    a file that gets committed.
--
--    First time:
--      select vault.create_secret('REPLACE_WITH_YOUR_SERVICE_ROLE_KEY', 'service_role_key');
--
--    If you ever need to rotate it:
--      select vault.update_secret(
--        (select id from vault.secrets where name = 'service_role_key'),
--        'REPLACE_WITH_YOUR_NEW_SERVICE_ROLE_KEY'
--      );

-- 3. Schedule the nightly run. Unschedules any existing job with the same
--    name first, so this block alone is safe to re-run after step 2.
select cron.unschedule('send-reminders-nightly')
where exists (select 1 from cron.job where jobname = 'send-reminders-nightly');

select cron.schedule(
  'send-reminders-nightly',
  '0 19 * * *', -- 7pm UTC ≈ 5-6am Sydney time (AEST/AEDT), before the school day starts.
                -- Drifts by an hour across daylight saving transitions; adjust if needed.
  $$
  select net.http_post(
    url := 'https://szzwmylsuwhtclavqwkl.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- 4. Verify it's scheduled.
select jobid, jobname, schedule, active from cron.job where jobname = 'send-reminders-nightly';
