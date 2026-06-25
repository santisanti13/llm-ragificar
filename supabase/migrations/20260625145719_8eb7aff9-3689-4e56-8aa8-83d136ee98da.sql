
SELECT cron.unschedule('generate-blog-post-every-12h') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'generate-blog-post-every-12h'
);

SELECT cron.schedule(
  'generate-blog-post-every-12h',
  '0 6,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ingyimnrogaxulfvlubg.supabase.co/functions/v1/generate-blog-post',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
