-- Google identity data is written by Supabase Auth, never by the public client.
create or replace function bkm_private.restrict_google_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
 if new.provider = 'google' and (
   lower(coalesce(new.identity_data->>'email','')) !~ '^[^@[:space:]]+@bkm[.]com[.]br$'
   or coalesce(new.identity_data->>'email_verified','false') <> 'true'
 ) then
   raise exception 'Entre com uma conta Google verificada @bkm.com.br.' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function bkm_private.restrict_google_identity() from public,anon,authenticated;
create trigger bkm_google_domain before insert or update on auth.identities
for each row execute function bkm_private.restrict_google_identity();

create table public.user_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 avatar_url text not null default '',
 mobile text check (mobile is null or mobile ~ '^\+[1-9][0-9]{7,14}$')
);
alter table public.user_profiles enable row level security;
revoke all on public.user_profiles from public,anon,authenticated;
grant select on public.user_profiles to authenticated;
grant update(mobile) on public.user_profiles to authenticated;
create policy profile_read_own on public.user_profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_update_own on public.user_profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));

-- These values are for display only. They must never authorize project access.
create or replace function bkm_private.sync_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 insert into public.user_profiles(id,full_name,avatar_url)
 values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''),200),left(coalesce(new.raw_user_meta_data->>'avatar_url',new.raw_user_meta_data->>'picture',''),2048))
 on conflict(id) do update set full_name=excluded.full_name,avatar_url=excluded.avatar_url;
 return new;
end $$;
revoke all on function bkm_private.sync_user_profile() from public,anon,authenticated;
create trigger bkm_sync_user_profile after insert or update of raw_user_meta_data on auth.users
for each row execute function bkm_private.sync_user_profile();
insert into public.user_profiles(id,full_name,avatar_url)
select id,left(coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),200),left(coalesce(raw_user_meta_data->>'avatar_url',raw_user_meta_data->>'picture',''),2048) from auth.users;
