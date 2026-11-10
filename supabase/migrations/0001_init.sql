-- Quiz V/F Claude Code — initial schema.
-- Only the server (service role) touches these tables: RLS is enabled with no
-- policies, so anon/authenticated clients have no access at all.

create extension if not exists "pgcrypto";

create type quiz_level as enum ('beginner', 'intermediate', 'advanced');

create table quiz_sessions (
  id            uuid primary key default gen_random_uuid(),
  level         quiz_level not null,
  locale        text not null check (locale in ('pt', 'en')),
  question_ids  text[] not null check (array_length(question_ids, 1) = 10),
  token_hash    text not null,                  -- sha256 of the player's secret token
  answers       jsonb,                          -- {"beg-001": true, ...}
  correct_count smallint check (correct_count between 0 and 10),
  score         smallint check (score between 0 and 300),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  duration_ms   integer check (duration_ms >= 0),
  ip_hash       text,                           -- sha256(ip + salt), never the raw IP
  published     boolean not null default false
);

create table leaderboard_entries (
  session_id    uuid primary key references quiz_sessions(id) on delete cascade,
  nickname      text not null check (char_length(nickname) between 3 and 20),
  level         quiz_level not null,
  score         smallint not null,
  correct_count smallint not null,
  duration_ms   integer not null,
  created_at    timestamptz not null default now()
);

create index leaderboard_order_idx
  on leaderboard_entries (score desc, duration_ms asc, created_at asc);

create table rate_limits (
  key           text primary key,
  window_start  timestamptz not null,
  count         integer not null
);

alter table quiz_sessions enable row level security;
alter table leaderboard_entries enable row level security;
alter table rate_limits enable row level security;

-- Atomically marks a finished, unpublished session as published and inserts its
-- leaderboard row. Returns the row, or nothing if the session can't be published.
create function publish_entry(p_session_id uuid, p_nickname text)
returns setof leaderboard_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  s quiz_sessions;
begin
  update quiz_sessions
     set published = true
   where id = p_session_id
     and finished_at is not null
     and published = false
  returning * into s;

  if not found then
    return;
  end if;

  return query
  insert into leaderboard_entries
    (session_id, nickname, level, score, correct_count, duration_ms)
  values
    (s.id, p_nickname, s.level, s.score, s.correct_count, s.duration_ms)
  returning *;
end;
$$;

-- Fixed-window rate limiter. Returns true while the key is within its limit.
create function hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set count = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then 1
          else r.count + 1
        end,
        window_start = case
          when r.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else r.window_start
        end
  returning count into current_count;

  return current_count <= p_limit;
end;
$$;

-- 1-based rank of an entry (strictly better entries + 1) and the total count.
create function leaderboard_rank(p_session_id uuid)
returns table (rank bigint, total bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from leaderboard_entries o
      where o.score > e.score
         or (o.score = e.score and o.duration_ms < e.duration_ms)
         or (o.score = e.score and o.duration_ms = e.duration_ms and o.created_at < e.created_at)
    ) + 1,
    (select count(*) from leaderboard_entries)
  from leaderboard_entries e
  where e.session_id = p_session_id;
$$;

revoke all on function publish_entry(uuid, text) from public, anon, authenticated;
revoke all on function hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function leaderboard_rank(uuid) from public, anon, authenticated;
grant execute on function publish_entry(uuid, text) to service_role;
grant execute on function hit_rate_limit(text, integer, integer) to service_role;
grant execute on function leaderboard_rank(uuid) to service_role;
