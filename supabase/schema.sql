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
create index if not exists notices_owner_created_idx on public.notices (owner_id, created_at desc);

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
create index if not exists comments_user_created_idx on public.comments (user_id, created_at desc);
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

create schema if not exists private;
revoke all on schema private from anon;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;
grant usage on schema private to authenticated;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "Käyttäjä näkee oman ylläpitoroolinsa" on public.user_roles;
create policy "Käyttäjä näkee oman ylläpitoroolinsa"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  notice_id uuid references public.notices(id) on delete set null,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_name text not null,
  notice_title text not null,
  reason text not null check (reason in (
    'spam', 'harassment', 'false_information', 'privacy', 'inappropriate_image', 'other'
  )),
  details text not null check (char_length(details) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
create index if not exists reports_reporter_created_idx on public.reports (reporter_id, created_at desc);
create unique index if not exists reports_one_pending_per_user_notice
  on public.reports (reporter_id, notice_id) where status = 'pending';
alter table public.reports enable row level security;
drop policy if exists "Kirjautunut käyttäjä voi ilmoittaa sisällöstä" on public.reports;
create policy "Kirjautunut käyttäjä voi ilmoittaa sisällöstä"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and notice_id is not null);
drop policy if exists "Ylläpito näkee ilmoitukset asiattomasta sisällöstä" on public.reports;
create policy "Ylläpito näkee ilmoitukset asiattomasta sisällöstä"
  on public.reports for select to authenticated
  using ((select private.is_admin()));
drop policy if exists "Ylläpito käsittelee ilmoitukset asiattomasta sisällöstä" on public.reports;
create policy "Ylläpito käsittelee ilmoitukset asiattomasta sisällöstä"
  on public.reports for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "Ylläpito voi poistaa ilmoituksia" on public.notices;
create policy "Ylläpito voi poistaa ilmoituksia" on public.notices
  for delete to authenticated using ((select private.is_admin()));

create table if not exists public.saved_notices (
  user_id uuid not null references auth.users(id) on delete cascade,
  notice_id uuid not null references public.notices(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, notice_id)
);
create index if not exists saved_notices_user_created_idx
  on public.saved_notices (user_id, created_at desc);
alter table public.saved_notices enable row level security;
drop policy if exists "Käyttäjä näkee omat tallennuksensa" on public.saved_notices;
create policy "Käyttäjä näkee omat tallennuksensa" on public.saved_notices
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Käyttäjä voi tallentaa ilmoituksen" on public.saved_notices;
create policy "Käyttäjä voi tallentaa ilmoituksen" on public.saved_notices
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Käyttäjä voi poistaa tallennuksen" on public.saved_notices;
create policy "Käyttäjä voi poistaa tallennuksen" on public.saved_notices
  for delete to authenticated using (user_id = (select auth.uid()));

-- Palvelinpuolen lähetysrajat. Lukitus estää rajan kiertämisen rinnakkaisilla pyynnöillä.
create or replace function private.enforce_submission_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  submission_count integer;
begin
  actor_id := case tg_table_name
    when 'notices' then new.owner_id
    when 'comments' then new.user_id
    when 'messages' then new.sender_id
    when 'reports' then new.reporter_id
    else null
  end;

  if actor_id is null or actor_id <> (select auth.uid()) then
    raise exception 'Lähettäjää ei voitu vahvistaa.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(tg_table_schema || '.' || tg_table_name || ':' || actor_id::text, 0)
  );

  if tg_table_name = 'notices' then
    select count(*) into submission_count from public.notices
      where owner_id = actor_id and created_at > now() - interval '1 hour';
    if submission_count >= 5 then
      raise exception 'Voit julkaista enintään 5 ilmoitusta tunnissa.' using errcode = 'P0001';
    end if;
    select count(*) into submission_count from public.notices
      where owner_id = actor_id and created_at > now() - interval '24 hours';
    if submission_count >= 10 then
      raise exception 'Voit julkaista enintään 10 ilmoitusta vuorokaudessa.' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.notices
      where owner_id = actor_id
        and lower(trim(title)) = lower(trim(new.title))
        and lower(trim(description)) = lower(trim(new.description))
        and created_at > now() - interval '10 minutes'
    ) then
      raise exception 'Saman ilmoituksen voi julkaista uudelleen aikaisintaan 10 minuutin kuluttua.' using errcode = 'P0001';
    end if;

  elsif tg_table_name = 'comments' then
    select count(*) into submission_count from public.comments
      where user_id = actor_id and created_at > now() - interval '10 minutes';
    if submission_count >= 10 then
      raise exception 'Voit lähettää enintään 10 kommenttia 10 minuutissa.' using errcode = 'P0001';
    end if;
    select count(*) into submission_count from public.comments
      where user_id = actor_id and created_at > now() - interval '24 hours';
    if submission_count >= 50 then
      raise exception 'Voit lähettää enintään 50 kommenttia vuorokaudessa.' using errcode = 'P0001';
    end if;

  elsif tg_table_name = 'messages' then
    select count(*) into submission_count from public.messages
      where sender_id = actor_id and created_at > now() - interval '1 minute';
    if submission_count >= 20 then
      raise exception 'Voit lähettää enintään 20 viestiä minuutissa.' using errcode = 'P0001';
    end if;
    select count(*) into submission_count from public.messages
      where sender_id = actor_id and created_at > now() - interval '24 hours';
    if submission_count >= 200 then
      raise exception 'Voit lähettää enintään 200 viestiä vuorokaudessa.' using errcode = 'P0001';
    end if;
    select count(*) into submission_count from public.messages
      where sender_id = actor_id
        and recipient_id = new.recipient_id
        and created_at > now() - interval '1 hour';
    if submission_count >= 40 then
      raise exception 'Voit lähettää samalle käyttäjälle enintään 40 viestiä tunnissa.' using errcode = 'P0001';
    end if;

  elsif tg_table_name = 'reports' then
    select count(*) into submission_count from public.reports
      where reporter_id = actor_id and created_at > now() - interval '1 hour';
    if submission_count >= 10 then
      raise exception 'Voit lähettää enintään 10 sisältöraporttia tunnissa.' using errcode = 'P0001';
    end if;
    select count(*) into submission_count from public.reports
      where reporter_id = actor_id and created_at > now() - interval '24 hours';
    if submission_count >= 30 then
      raise exception 'Voit lähettää enintään 30 sisältöraporttia vuorokaudessa.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;
revoke all on function private.enforce_submission_limits() from public;

drop trigger if exists enforce_notice_submission_limits on public.notices;
create trigger enforce_notice_submission_limits
  before insert on public.notices
  for each row execute function private.enforce_submission_limits();
drop trigger if exists enforce_comment_submission_limits on public.comments;
create trigger enforce_comment_submission_limits
  before insert on public.comments
  for each row execute function private.enforce_submission_limits();
drop trigger if exists enforce_message_submission_limits on public.messages;
create trigger enforce_message_submission_limits
  before insert on public.messages
  for each row execute function private.enforce_submission_limits();
drop trigger if exists enforce_report_submission_limits on public.reports;
create trigger enforce_report_submission_limits
  before insert on public.reports
  for each row execute function private.enforce_submission_limits();

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
do $$
begin
  perform cron.unschedule('cleanup-expired-notices');
exception when others then
  null;
end;
$$;
select cron.schedule(
  'cleanup-expired-notices',
  '0 * * * *',
  $$select public.cleanup_expired_notices();$$
);
