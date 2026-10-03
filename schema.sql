-- AutómataLab: esquema para Supabase. Ejecutar completo en SQL Editor.
-- Para uso en clase: Authentication → Providers → Email → desactiva "Confirm email".

create extension if not exists pgcrypto;
drop table if exists public.scores, public.exercises cascade; -- reemplaza el esquema anterior (los retos ahora viven en js/arena.js)

-- Perfil público: el nombre que aparece en el ranking
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text not null unique check (username ~ '^[A-Za-z0-9_-]{3,20}$'),
  created_at timestamptz not null default now()
);

-- Simulaciones guardadas desde el simulador
create table if not exists public.simulations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  automaton_type text not null check (automaton_type in ('AFD','AFND')),
  preset         text,
  input          text not null check (input ~ '^[01]*$'),
  accepted       boolean not null,
  trace          jsonb not null default '[]',
  created_at     timestamptz not null default now()
);
create index if not exists simulations_user_idx on public.simulations (user_id, created_at desc);

-- Mejor puntaje de cada estudiante en cada reto (máximo 120 = 100 exactitud + 20 bono)
create table public.scores (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exercise   text not null,
  score      int  not null check (score between 0 and 120),
  states     int  not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise)
);

-- Al registrarse en auth.users se crea el perfil automáticamente
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Guarda solo si mejora el puntaje; el cliente nunca escribe en scores directamente
create or replace function public.submit_score(p_ex text, p_score int, p_states int) returns void
language sql security definer set search_path = public as $$
  insert into public.scores (user_id, exercise, score, states)
  values (auth.uid(), p_ex, p_score, p_states)
  on conflict (user_id, exercise) do update set
    states     = case when excluded.score > scores.score then excluded.states else scores.states end,
    score      = greatest(scores.score, excluded.score),
    updated_at = now();
$$;
revoke all on function public.submit_score(text, int, int) from public, anon;
grant execute on function public.submit_score(text, int, int) to authenticated;

-- Ranking del curso: puntos totales y retos resueltos al 100 %
create or replace view public.leaderboard as
select p.username,
       coalesce(sum(s.score), 0)::int as points,
       (count(s.exercise) filter (where s.score >= 100))::int as solved,
       max(s.updated_at) as last_at
from public.profiles p left join public.scores s on s.user_id = p.id
group by p.id, p.username
order by points desc, last_at asc nulls last;
revoke all on public.leaderboard from anon;
grant select on public.leaderboard to authenticated;

-- Row Level Security
alter table public.profiles    enable row level security;
alter table public.simulations enable row level security;
alter table public.scores      enable row level security;

drop policy if exists "simulations_owner_all" on public.simulations;
create policy "simulations_owner_all" on public.simulations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_read"    on public.profiles for select to authenticated using (true);
create policy "scores_read_own"  on public.scores   for select to authenticated using (auth.uid() = user_id);
