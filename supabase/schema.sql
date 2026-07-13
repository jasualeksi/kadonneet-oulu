create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 3 and 30),
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "Käyttäjänimet ovat nähtävissä" on public.profiles;
create policy "Käyttäjänimet ovat nähtävissä"
  on public.profiles for select
  using (true);

drop policy if exists "Käyttäjä voi päivittää oman profiilinsa" on public.profiles;
create policy "Käyttäjä voi päivittää oman profiilinsa"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.username_is_allowed(input_username text)
returns boolean
language sql
immutable
as $$
  select
    input_username ~ '^[a-zA-ZåäöÅÄÖ0-9_-]{3,30}$'
    and not exists (
      select 1
      from unnest(array[
        'vittu','perkele','saatana','helvetti','paska','paskiainen',
        'kusipaa','kyrpa','mulkku','huora','lutka','neekeri','nekru',
        'ryssa','hintti','natsi','nazi','hitler','whitepower','retard',
        'admin','administrator','yllapito','moderaattori','kadonneetoulu',
        'poliisi'
      ]) as blocked(part)
      where regexp_replace(
        lower(translate(input_username, 'åäö013457@$!', 'aaooieastasi')),
        '[^a-z0-9]', '', 'g'
      ) like '%' || blocked.part || '%'
    );
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_username_allowed'
  ) then
    alter table public.profiles
      add constraint profiles_username_allowed
      check (public.username_is_allowed(username));
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, trim(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
