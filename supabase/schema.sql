-- Where the Drops Freeze 스키마. SQL Editor에 통째로 붙여넣어 실행.
-- 여러 번 실행해도 괜찮게 작성함.
-- 숫자 제한(격자 폭 90, 크기 1~4, 200개, 합계 400)은 src/core/config.ts와 같아야 한다.

-- ───────── 테이블 ─────────

create table if not exists public.artworks (
  id           text primary key,
  owner        uuid not null references auth.users on delete cascade,
  seed         bigint not null check (seed between 0 and 4294967295), -- uint32라 bigint
  shape        text not null check (shape in ('triangle', 'flat')),
  drops        int[] not null, -- [x, size, x, size, ...]
  drop_count   int not null,
  like_count   int not null default 0,
  report_count int not null default 0,
  hidden       boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.likes (
  artwork_id text not null references public.artworks on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (artwork_id, user_id)
);

create table if not exists public.reports (
  artwork_id text not null references public.artworks on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  reason     text not null check (reason in ('ugly', 'spam', 'etc')),
  created_at timestamptz not null default now(),
  primary key (artwork_id, user_id)
);

create index if not exists artworks_owner_idx on public.artworks (owner, created_at desc);
create index if not exists artworks_popular_idx on public.artworks (like_count desc, created_at desc) where not hidden;
create index if not exists artworks_created_idx on public.artworks (created_at);

-- ───────── 권한 / RLS ─────────
-- 쓰기는 RPC로만. 읽기는 공개 컬럼만 (owner, report_count, hidden은 안 보임).

alter table public.artworks enable row level security;
alter table public.likes enable row level security;
alter table public.reports enable row level security;

revoke all on public.artworks, public.likes, public.reports from anon, authenticated;
grant select (id, seed, shape, drops, drop_count, like_count, created_at)
  on public.artworks to anon, authenticated;
grant select (artwork_id, user_id, created_at) on public.likes to authenticated;

drop policy if exists "공개 작품 읽기" on public.artworks;
create policy "공개 작품 읽기" on public.artworks
  for select to anon, authenticated
  using (not hidden);

drop policy if exists "내 좋아요 읽기" on public.likes;
create policy "내 좋아요 읽기" on public.likes
  for select to authenticated
  using (user_id = (select auth.uid()));

-- reports는 정책 없음 = 클라이언트에서 못 읽음

-- ───────── 짧은 id (7자) ─────────

create or replace function public.short_id() returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('abcdefghijkmnpqrstuvwxyz23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 7)
$$;

-- ───────── RPC: 저장 ─────────
-- 에러 메시지는 클라이언트가 구분하는 코드: not_signed_in, invalid_shape, invalid_drops, daily_limit

create or replace function public.save_artwork(p_seed bigint, p_shape text, p_drops int[])
returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  n int := coalesce(array_length(p_drops, 1), 0) / 2;
  new_id text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if p_shape not in ('triangle', 'flat') then raise exception 'invalid_shape'; end if;
  if p_seed not between 0 and 4294967295 then raise exception 'invalid_drops'; end if;

  -- 개수 5~200, 짝수 길이
  if coalesce(array_length(p_drops, 1), 0) % 2 <> 0 or n < 5 or n > 200 then
    raise exception 'invalid_drops';
  end if;

  -- x는 0~89, 크기는 1~4, 크기 합계 400 이하
  if exists (
    select 1 from unnest(p_drops) with ordinality as d(v, i)
    where v is null
       or (i % 2 = 1 and v not between 0 and 89)
       or (i % 2 = 0 and v not between 1 and 4)
  ) or (
    select sum(v) from unnest(p_drops) with ordinality as d(v, i) where i % 2 = 0
  ) > 400 then
    raise exception 'invalid_drops';
  end if;

  -- 하루(24시간) 10개
  if (select count(*) from public.artworks
      where owner = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'daily_limit';
  end if;

  -- id 충돌하면 다시
  loop
    new_id := public.short_id();
    begin
      insert into public.artworks (id, owner, seed, shape, drops, drop_count)
      values (new_id, uid, p_seed, p_shape, p_drops, n);
      return new_id;
    exception when unique_violation then
      -- 다시 시도
    end;
  end loop;
end $$;

-- ───────── RPC: 좋아요 ─────────
-- 이미 눌렀으면 그대로. 현재 좋아요 수를 돌려준다.

create or replace function public.like_artwork(p_id text)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  cnt int;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.artworks where id = p_id and not hidden) then
    raise exception 'not_found';
  end if;

  insert into public.likes (artwork_id, user_id) values (p_id, uid)
  on conflict do nothing;
  if found then
    update public.artworks set like_count = like_count + 1 where id = p_id;
  end if;

  select like_count into cnt from public.artworks where id = p_id;
  return cnt;
end $$;

-- ───────── RPC: 신고 ─────────
-- 서로 다른 3명이 신고하면 숨김.

create or replace function public.report_artwork(p_id text, p_reason text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if p_reason not in ('ugly', 'spam', 'etc') then raise exception 'invalid_reason'; end if;
  if not exists (select 1 from public.artworks where id = p_id) then
    raise exception 'not_found';
  end if;

  insert into public.reports (artwork_id, user_id, reason) values (p_id, uid, p_reason)
  on conflict do nothing;
  if found then
    update public.artworks
    set report_count = report_count + 1,
        hidden = hidden or report_count + 1 >= 3
    where id = p_id;
  end if;
end $$;

-- ───────── 인기순 목록 ─────────
-- 좋아요 많은 순, 같으면 최신 순. RLS가 그대로 적용됨(숨김 제외).

create or replace function public.popular_artworks(p_limit int default 20, p_offset int default 0)
returns table (id text, seed bigint, shape text, drops int[], drop_count int, like_count int, created_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select a.id, a.seed, a.shape, a.drops, a.drop_count, a.like_count, a.created_at
  from public.artworks a -- hidden은 RLS가 거름 (컬럼 권한이 없어서 직접 쓰면 에러)
  order by a.like_count desc, a.created_at desc
  limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
$$;

-- ───────── 내 작품 ─────────
-- owner·hidden은 공개 컬럼이 아니라서 RPC로. 숨겨진 내 작품도 보여준다(표시용).

create or replace function public.my_artworks()
returns table (id text, seed bigint, shape text, drops int[], drop_count int, like_count int, hidden boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id, a.seed, a.shape, a.drops, a.drop_count, a.like_count, a.hidden, a.created_at
  from public.artworks a
  where a.owner = auth.uid()
  order by a.created_at desc
$$;

-- ───────── 함수 실행 권한 ─────────

revoke execute on function public.short_id() from public, anon, authenticated;
revoke execute on function public.save_artwork(bigint, text, int[]) from public, anon;
revoke execute on function public.like_artwork(text) from public, anon;
revoke execute on function public.report_artwork(text, text) from public, anon;
grant execute on function public.save_artwork(bigint, text, int[]) to authenticated;
grant execute on function public.like_artwork(text) to authenticated;
grant execute on function public.report_artwork(text, text) to authenticated;
grant execute on function public.popular_artworks(int, int) to anon, authenticated;
revoke execute on function public.my_artworks() from public, anon;
grant execute on function public.my_artworks() to authenticated;
