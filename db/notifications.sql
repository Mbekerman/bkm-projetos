-- In-app inbox only. No e-mail, push, external messaging or historical backfill.
create table public.project_notifications (
 id bigint generated always as identity primary key,
 project_id uuid not null references public.projects(id),
 recipient_id uuid not null references auth.users(id),
 actor_id uuid references auth.users(id),
 kind text not null check(kind in ('task_assigned','task_comment','review_requested','review_decided')),
 target_id uuid not null,
 title text not null check(length(title) between 1 and 250),
 created_at timestamptz not null default now(),read_at timestamptz
);
create index notifications_recipient_id on public.project_notifications(recipient_id,id desc);
create index notifications_unread on public.project_notifications(recipient_id,project_id,id desc) where read_at is null;
create index notifications_project on public.project_notifications(project_id);
create index notifications_actor on public.project_notifications(actor_id);
alter table public.project_notifications enable row level security;
revoke all on public.project_notifications from public,anon,authenticated;
grant select on public.project_notifications to authenticated;
grant update(read_at) on public.project_notifications to authenticated;
create policy notifications_read on public.project_notifications for select to authenticated
 using(recipient_id=(select auth.uid()) and bkm_private.can_access_project(project_id));
create policy notifications_mark on public.project_notifications for update to authenticated
 using(recipient_id=(select auth.uid()) and bkm_private.can_access_project(project_id))
 with check(recipient_id=(select auth.uid()) and bkm_private.can_access_project(project_id));

-- Only internal triggers may call this function. Recipients must still belong to
-- the project; user-controlled metadata and browser-supplied recipients are absent.
create function bkm_private.notify_project(p_project uuid,p_recipients uuid[],p_kind text,p_target uuid,p_title text) returns void
language sql security definer set search_path='' as $$
 insert into public.project_notifications(project_id,recipient_id,actor_id,kind,target_id,title)
 select p_project,candidate,auth.uid(),p_kind,p_target,left(p_title,250)
 from (select distinct unnest(p_recipients) as candidate) candidates
 where auth.uid() is not null and candidate<>auth.uid() and exists(
  select 1 from public.projects p where p.id=p_project and
   (p.owner_id=candidate or exists(select 1 from public.project_members m where m.project_id=p.id and m.user_id=candidate))
 );
$$;
create function bkm_private.notification_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare task public.project_tasks;owner uuid;title text;
begin
 if tg_table_name='project_tasks' then
  if not new.archived and new.stage<>'done' and new.assignee_id is not null and (tg_op='INSERT' or new.assignee_id is distinct from old.assignee_id) then
   perform bkm_private.notify_project(new.project_id,array[new.assignee_id],'task_assigned',new.id,'Tarefa atribuída a você: '||new.title);
  end if;
 elsif tg_table_name='task_comments' then
  select * into task from public.project_tasks where id=new.task_id and project_id=new.project_id;
  perform bkm_private.notify_project(new.project_id,array[task.assignee_id,task.created_by],'task_comment',task.id,'Novo comentário na tarefa: '||task.title);
 elsif tg_table_name='revision_reviews' then
  select p.owner_id into owner from public.projects p where p.id=new.project_id;
  select d.code||' · revisão '||r.revision_code into title from public.document_revisions r join public.documents d on d.id=r.document_id where r.id=new.revision_id;
  if tg_op='INSERT' then
   perform bkm_private.notify_project(new.project_id,array[owner],'review_requested',new.id,'Análise solicitada: '||coalesce(title,'Revisão'));
  elsif old.status='in_review' and new.status<>'in_review' then
   perform bkm_private.notify_project(new.project_id,array[new.requested_by],'review_decided',new.id,'Parecer registrado: '||coalesce(title,'Revisão'));
  end if;
 end if;
 return null;
end $$;
revoke all on function bkm_private.notify_project(uuid,uuid[],text,uuid,text),bkm_private.notification_event() from public,anon,authenticated;
create trigger tasks_notify after insert or update on public.project_tasks for each row execute function bkm_private.notification_event();
create trigger task_comments_notify after insert on public.task_comments for each row execute function bkm_private.notification_event();
create trigger reviews_notify after insert or update on public.revision_reviews for each row execute function bkm_private.notification_event();

create function public.list_notifications(p_project_id uuid default null,p_unread boolean default true,p_before bigint default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_project_id is not null and not bkm_private.can_access_project(p_project_id) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_unread is null or p_before<=0 then raise exception 'Filtro inválido.' using errcode='23514';end if;
 with scoped as materialized (
  select n.*,p.name as project_name,p.code as project_code from public.project_notifications n
  join public.projects p on p.id=n.project_id
  where (p_project_id is null or n.project_id=p_project_id)
 ), candidates as materialized (
  select * from scoped where (not p_unread or read_at is null) and (p_before is null or id<p_before)
  order by id desc limit 26
 ), page as (select * from candidates order by id desc limit 25)
 select jsonb_build_object('items',coalesce((select jsonb_agg((to_jsonb(n)-'id'-'recipient_id')||jsonb_build_object('id',n.id::text) order by n.id desc) from page n),'[]'::jsonb),
  'unread_count',(select count(*) from scoped where read_at is null),
  'through_id',(select max(id)::text from scoped),
  'next_cursor',(select min(id)::text from page),'has_more',(select count(*)>25 from candidates)) into result;
 return result;
end $$;
create function public.mark_notification(p_notification_id bigint,p_read boolean default true) returns integer
language plpgsql security invoker set search_path='' as $$
declare result integer;
begin
 if auth.uid() is null then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_read is null or p_notification_id is null or p_notification_id<=0 then raise exception 'Aviso inválido.' using errcode='23514';end if;
 update public.project_notifications set read_at=case when p_read then now() else null end where id=p_notification_id;
 get diagnostics result=row_count;return result;
end $$;
create function public.mark_notifications_read(p_through bigint,p_project_id uuid default null) returns integer
language plpgsql security invoker set search_path='' as $$
declare result integer;
begin
 if auth.uid() is null then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if p_through is null or p_through<=0 then raise exception 'Limite inválido.' using errcode='23514';end if;
 if p_project_id is not null and not bkm_private.can_access_project(p_project_id) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 update public.project_notifications set read_at=now() where id<=p_through and read_at is null and (p_project_id is null or project_id=p_project_id);
 get diagnostics result=row_count;return result;
end $$;
revoke all on function public.list_notifications(uuid,boolean,bigint),public.mark_notification(bigint,boolean),public.mark_notifications_read(bigint,uuid) from public,anon,authenticated;
grant execute on function public.list_notifications(uuid,boolean,bigint),public.mark_notification(bigint,boolean),public.mark_notifications_read(bigint,uuid) to authenticated;
