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
        'poliisi','nigga','nigger','niga'
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

insert into public.profiles (id, username)
select id, trim(raw_user_meta_data ->> 'username')
from auth.users
where raw_user_meta_data ->> 'username' is not null
on conflict (id) do nothing;

create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  type text not null check (type in ('Eläin', 'Ihminen', 'Ajoneuvo', 'Tavara')),
  title text not null check (char_length(title) between 3 and 120),
  area text not null,
  description text not null check (char_length(description) between 5 and 600),
  phone text,
  contact_email text not null,
  reward integer check (reward is null or reward between 1 and 100000),
  image_url text,
  status text not null default 'open' check (status in ('open', 'found')),
  found_at timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

alter table public.notices drop constraint if exists notices_type_check;
update public.notices set type = 'Ajoneuvo' where type = 'Menopeli';
alter table public.notices add constraint notices_type_check
  check (type in ('Eläin', 'Ihminen', 'Ajoneuvo', 'Tavara'));

create index if not exists notices_created_at_idx on public.notices (created_at desc);
create index if not exists notices_owner_id_idx on public.notices (owner_id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notices'
      and column_name = 'reward'
      and data_type <> 'integer'
  ) then
    alter table public.notices
      alter column reward type integer
      using case
        when regexp_replace(coalesce(reward, ''), '[^0-9]', '', 'g') = '' then null
        else regexp_replace(reward, '[^0-9]', '', 'g')::integer
      end;
  end if;
end $$;

alter table public.notices drop constraint if exists notices_reward_range;
alter table public.notices add constraint notices_reward_range
  check (reward is null or reward between 1 and 100000);

alter table public.notices enable row level security;

drop policy if exists "Ilmoitukset näkyvät kaikille" on public.notices;
create policy "Ilmoitukset näkyvät kaikille" on public.notices
  for select using (
    expires_at > now()
    and (found_at is null or found_at > now() - interval '5 days')
  );
drop policy if exists "Vahvistettu käyttäjä voi luoda ilmoituksen" on public.notices;
create policy "Vahvistettu käyttäjä voi luoda ilmoituksen" on public.notices
  for insert with check (auth.uid() = owner_id);
drop policy if exists "Omistaja voi päivittää ilmoituksen" on public.notices;
create policy "Omistaja voi päivittää ilmoituksen" on public.notices
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Omistaja voi poistaa ilmoituksen" on public.notices;
create policy "Omistaja voi poistaa ilmoituksen" on public.notices
  for delete using (auth.uid() = owner_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  notice_id uuid not null references public.notices(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null,
  body text check (body is null or char_length(body) <= 1000),
  image_url text,
  created_at timestamptz not null default now(),
  check (body is not null or image_url is not null)
);

create index if not exists comments_notice_id_idx on public.comments (notice_id, created_at);
alter table public.comments enable row level security;
drop policy if exists "Kommentit näkyvät kaikille" on public.comments;
create policy "Kommentit näkyvät kaikille" on public.comments for select using (true);
drop policy if exists "Kirjautunut käyttäjä voi kommentoida" on public.comments;
create policy "Kirjautunut käyttäjä voi kommentoida" on public.comments
  for insert with check (auth.uid() = user_id);
drop policy if exists "Kommentoija voi poistaa kommentin" on public.comments;
create policy "Kommentoija voi poistaa kommentin" on public.comments
  for delete using (auth.uid() = user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  recipient_name text not null,
  body text check (body is null or char_length(body) between 1 and 2000),
  image_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id),
  check (body is not null or image_url is not null)
);

alter table public.messages add column if not exists image_url text;
alter table public.messages alter column body drop not null;
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages add constraint messages_content_check
  check (
    (body is not null and char_length(body) between 1 and 2000)
    or image_url is not null
  );

create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at desc);
alter table public.messages enable row level security;
drop policy if exists "Viestin osapuolet näkevät viestin" on public.messages;
create policy "Viestin osapuolet näkevät viestin" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists "Käyttäjä voi lähettää viestin" on public.messages;
create policy "Käyttäjä voi lähettää viestin" on public.messages
  for insert with check (auth.uid() = sender_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Kuvat näkyvät kaikille" on storage.objects;
create policy "Kuvat näkyvät kaikille" on storage.objects
  for select using (bucket_id = 'uploads');
drop policy if exists "Käyttäjä voi lisätä kuvia" on storage.objects;
create policy "Käyttäjä voi lisätä kuvia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "Käyttäjä voi poistaa omia kuvia" on storage.objects;
create policy "Käyttäjä voi poistaa omia kuvia" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.cleanup_expired_notices()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.notices
  where expires_at <= now()
     or (found_at is not null and found_at <= now() - interval '5 days');
end;
$$;

create extension if not exists pg_cron;
select cron.schedule(
  'cleanup-expired-notices',
  '0 * * * *',
  $$select public.cleanup_expired_notices();$$
);
