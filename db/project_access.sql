create table public.project_access_invites (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),
 email text not null check(email=lower(btrim(email)) and email ~ '^[^@[:space:]]+@bkm[.]com[.]br$' and length(email)<=254),
 role text not null check(role in ('editor','reader')),
 created_by uuid not null default auth.uid() references auth.users(id),created_at timestamptz not null default now(),
 accepted_by uuid references auth.users(id),accepted_at timestamptz,revoked_at timestamptz,
 check((accepted_by is null)=(accepted_at is null))
);
create unique index access_invites_active_email on public.project_access_invites(project_id,email) where revoked_at is null;
create index access_invites_pending on public.project_access_invites(email,project_id) where revoked_at is null and accepted_by is null;
create index access_invites_creator on public.project_access_invites(created_by);
create index access_invites_acceptor on public.project_access_invites(accepted_by);
alter table public.project_access_invites enable row level security;
revoke all on public.project_access_invites from public,anon,authenticated;
grant select on public.project_access_invites to authenticated;
create policy access_invites_read on public.project_access_invites for select to authenticated using(bkm_private.owns_project(project_id));

-- Keep invitation emails out of the audit feed read by other project members.
create function bkm_private.audit_access_invite() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_events(project_id,actor_id,entity_type,entity_id,action,old_values,new_values)
 values(new.project_id,auth.uid(),'project_access_invites',new.id::text,tg_op,case when tg_op='UPDATE' then to_jsonb(old)-'email' end,to_jsonb(new)-'email');
 return null;
end $$;
revoke all on function bkm_private.audit_access_invite() from public,anon,authenticated;
create trigger access_invites_audit after insert or update on public.project_access_invites for each row execute function bkm_private.audit_access_invite();

-- Authorization derives only from Auth-controlled identity data.
create function bkm_private.verified_bkm_email(p_user_id uuid) returns text language sql stable security definer set search_path='' as $$
 select lower(u.email) from auth.users u where u.id=p_user_id and u.email_confirmed_at is not null
 and lower(u.email) ~ '^[^@[:space:]]+@bkm[.]com[.]br$'
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google' and lower(i.identity_data->>'email')=lower(u.email) and i.identity_data->>'email_verified'='true');
$$;
revoke all on function bkm_private.verified_bkm_email(uuid) from public,anon,authenticated;

create function bkm_private.add_project_access(p_project_id uuid,p_email text,p_role text) returns uuid language plpgsql security definer set search_path='' as $$
declare target_email text=lower(btrim(coalesce(p_email,'')));target_user uuid;invite_id uuid;owner_email text;
begin
 if auth.uid() is null or not bkm_private.owns_project(p_project_id) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_role is null or p_role not in ('editor','reader') or length(target_email)>254 or target_email !~ '^[^@[:space:]]+@bkm[.]com[.]br$' then raise exception 'Informe um e-mail @bkm.com.br e um papel válido.' using errcode='23514';end if;
 perform 1 from public.projects where id=p_project_id and not archived for update;if not found then raise exception 'Restaure o projeto antes de adicionar participantes.' using errcode='42501';end if;
 select lower(u.email) into owner_email from auth.users u join public.projects p on p.owner_id=u.id where p.id=p_project_id;
 if target_email=owner_email then raise exception 'O proprietário já tem acesso ao projeto.' using errcode='23514';end if;
 select i.id into invite_id from public.project_access_invites i where i.project_id=p_project_id and i.email=target_email and i.revoked_at is null for update;
 if invite_id is not null then raise exception 'Este e-mail já tem uma autorização ativa. Altere o papel ou revogue a autorização existente.' using errcode='23514';end if;
 select u.id into target_user from auth.users u where lower(u.email)=target_email and bkm_private.verified_bkm_email(u.id)=target_email limit 1;
 insert into public.project_access_invites(project_id,email,role,created_by,accepted_by,accepted_at)
 values(p_project_id,target_email,p_role,auth.uid(),target_user,case when target_user is not null then now() end) returning id into invite_id;
 if target_user is not null then
  insert into public.project_members(project_id,user_id,role) values(p_project_id,target_user,p_role) on conflict(project_id,user_id) do update set role=excluded.role;
 end if;
 return invite_id;
end $$;

create function bkm_private.accept_project_access() returns integer language plpgsql security definer set search_path='' as $$
declare target_email text;candidate record;inv public.project_access_invites;accepted integer=0;
begin
 if auth.uid() is null then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 target_email=bkm_private.verified_bkm_email(auth.uid());if target_email is null then return 0;end if;
 for candidate in select id,project_id from public.project_access_invites where email=target_email and revoked_at is null and accepted_by is null order by project_id,id loop
  perform 1 from public.projects where id=candidate.project_id and not archived for update;if not found then continue;end if;
  select * into inv from public.project_access_invites where id=candidate.id and email=target_email and revoked_at is null and accepted_by is null for update;if not found then continue;end if;
  if exists(select 1 from public.projects where id=inv.project_id and owner_id=auth.uid()) then continue;end if;
  -- An earlier manual membership remains authoritative; a login never widens it.
  insert into public.project_members(project_id,user_id,role) values(inv.project_id,auth.uid(),inv.role) on conflict(project_id,user_id) do nothing;
  update public.project_access_invites set accepted_by=auth.uid(),accepted_at=now(),role=(select m.role from public.project_members m where m.project_id=inv.project_id and m.user_id=auth.uid()) where id=inv.id;accepted=accepted+1;
 end loop;
 return accepted;
end $$;

create function bkm_private.change_project_member(p_project_id uuid,p_user_id uuid,p_role text) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not bkm_private.owns_project(p_project_id) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_role is null or p_role not in ('editor','reader') then raise exception 'Papel inválido.' using errcode='23514';end if;
 perform 1 from public.projects where id=p_project_id and not archived for update;if not found then raise exception 'Restaure o projeto antes de alterar papéis.' using errcode='42501';end if;
 if exists(select 1 from public.projects where id=p_project_id and owner_id=p_user_id) then raise exception 'O proprietário não pode ser alterado por este fluxo.' using errcode='23514';end if;
 update public.project_members set role=p_role where project_id=p_project_id and user_id=p_user_id;if not found then raise exception 'Participante não encontrado.' using errcode='23514';end if;
 update public.project_access_invites set role=p_role where project_id=p_project_id and accepted_by=p_user_id and revoked_at is null;
 return p_user_id;
end $$;
create function bkm_private.revoke_project_member(p_project_id uuid,p_user_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not bkm_private.owns_project(p_project_id) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 perform 1 from public.projects where id=p_project_id for update;
 if exists(select 1 from public.projects where id=p_project_id and owner_id=p_user_id) then raise exception 'O proprietário não pode ser removido.' using errcode='23514';end if;
 delete from public.project_members where project_id=p_project_id and user_id=p_user_id;
 update public.project_access_invites set revoked_at=now() where project_id=p_project_id and accepted_by=p_user_id and revoked_at is null;
 return p_user_id;
end $$;
create function bkm_private.revoke_project_invite(p_invite_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare project uuid;inv public.project_access_invites;
begin
 select project_id into project from public.project_access_invites where id=p_invite_id;
 if auth.uid() is null or not bkm_private.owns_project(project) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 perform 1 from public.projects where id=project for update;
 select * into inv from public.project_access_invites where id=p_invite_id for update;
 if inv.revoked_at is not null then return p_invite_id;end if;
 if inv.accepted_by is not null then
  if exists(select 1 from public.projects where id=project and owner_id=inv.accepted_by) then raise exception 'O proprietário não pode ser removido.' using errcode='23514';end if;
  delete from public.project_members where project_id=project and user_id=inv.accepted_by;
 end if;
 update public.project_access_invites set revoked_at=now() where revoked_at is null and (id=p_invite_id or (project_id=project and accepted_by=inv.accepted_by));
 return p_invite_id;
end $$;
revoke all on function bkm_private.add_project_access(uuid,text,text),bkm_private.accept_project_access(),bkm_private.change_project_member(uuid,uuid,text),bkm_private.revoke_project_member(uuid,uuid),bkm_private.revoke_project_invite(uuid) from public,anon,authenticated;
grant execute on function bkm_private.add_project_access(uuid,text,text),bkm_private.accept_project_access(),bkm_private.change_project_member(uuid,uuid,text),bkm_private.revoke_project_member(uuid,uuid),bkm_private.revoke_project_invite(uuid) to authenticated;
create function public.add_project_access(p_project_id uuid,p_email text,p_role text) returns uuid language sql security invoker set search_path='' as $$ select bkm_private.add_project_access(p_project_id,p_email,p_role); $$;
create function public.accept_project_access() returns integer language sql security invoker set search_path='' as $$ select bkm_private.accept_project_access(); $$;
create function public.change_project_member(p_project_id uuid,p_user_id uuid,p_role text) returns uuid language sql security invoker set search_path='' as $$ select bkm_private.change_project_member(p_project_id,p_user_id,p_role); $$;
create function public.revoke_project_member(p_project_id uuid,p_user_id uuid) returns uuid language sql security invoker set search_path='' as $$ select bkm_private.revoke_project_member(p_project_id,p_user_id); $$;
create function public.revoke_project_invite(p_invite_id uuid) returns uuid language sql security invoker set search_path='' as $$ select bkm_private.revoke_project_invite(p_invite_id); $$;
revoke all on function public.add_project_access(uuid,text,text),public.accept_project_access(),public.change_project_member(uuid,uuid,text),public.revoke_project_member(uuid,uuid),public.revoke_project_invite(uuid) from public,anon,authenticated;
grant execute on function public.add_project_access(uuid,text,text),public.accept_project_access(),public.change_project_member(uuid,uuid,text),public.revoke_project_member(uuid,uuid),public.revoke_project_invite(uuid) to authenticated;
create function bkm_private.change_project_invite(p_invite_id uuid,p_role text) returns uuid language plpgsql security definer set search_path='' as $$
declare project uuid;inv public.project_access_invites;
begin
 select project_id into project from public.project_access_invites where id=p_invite_id;
 if auth.uid() is null or not bkm_private.owns_project(project) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_role is null or p_role not in ('editor','reader') then raise exception 'Papel inválido.' using errcode='23514';end if;
 perform 1 from public.projects where id=project and not archived for update;if not found then raise exception 'Restaure o projeto antes de alterar papéis.' using errcode='42501';end if;
 select * into inv from public.project_access_invites where id=p_invite_id and revoked_at is null for update;if not found then raise exception 'Esta autorização já foi revogada.' using errcode='23514';end if;
 if inv.accepted_by is not null then perform bkm_private.change_project_member(project,inv.accepted_by,p_role);else update public.project_access_invites set role=p_role where id=p_invite_id;end if;
 return p_invite_id;
end $$;
revoke all on function bkm_private.change_project_invite(uuid,text) from public,anon,authenticated;
grant execute on function bkm_private.change_project_invite(uuid,text) to authenticated;
create function public.change_project_invite(p_invite_id uuid,p_role text) returns uuid language sql security invoker set search_path='' as $$ select bkm_private.change_project_invite(p_invite_id,p_role); $$;
revoke all on function public.change_project_invite(uuid,text) from public,anon,authenticated;
grant execute on function public.change_project_invite(uuid,text) to authenticated;

-- Existing direct member operations remain owner-only and cannot grant/edit on archived projects.
alter policy members_create on public.project_members with check(bkm_private.owns_project(project_id) and bkm_private.can_access_project(project_id,true));
alter policy members_edit on public.project_members using(bkm_private.owns_project(project_id) and bkm_private.can_access_project(project_id,true)) with check(bkm_private.owns_project(project_id) and bkm_private.can_access_project(project_id,true));
