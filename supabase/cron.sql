-- 30일 지난 작품을 하루 1번 삭제. schema.sql 다음에 실행.
-- likes, reports는 on delete cascade로 같이 지워진다.
-- 대시보드 Integrations(Database → Extensions)에서 pg_cron을 켜도 되고, 아래 줄로 켜도 된다.

create extension if not exists pg_cron;

-- 같은 이름이면 덮어씀. 매일 04:00 UTC (한국 13:00)
select cron.schedule(
  'delete-old-artworks',
  '0 4 * * *',
  $$ delete from public.artworks where created_at < now() - interval '30 days' $$
);

-- 확인: select * from cron.job;
-- 실행 기록: select * from cron.job_run_details order by start_time desc limit 10;
-- 끄기: select cron.unschedule('delete-old-artworks');
