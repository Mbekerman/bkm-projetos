-- Adapted from BKM Terrenos fluxo core, scoped to projects in this database.
alter table public.document_revisions add constraint revisions_task_context unique(id,document_id,project_id);
alter table public.document_annotations add constraint annotations_task_context unique(id,revision_id,project_id);
create table public.project_tasks (
 id uuid primary key default gen_random_uuid(), task_number bigint generated always as identity unique,
 project_id uuid not null references public.projects(id),
 title text not null check(length(btrim(title)) between 1 and 150),
 description text not null default '' check(length(description)<=5000),
 stage text not null default 'todo' check(stage in ('backlog','todo','doing','waiting','paused','done')),
 priority text not null default 'medium' check(priority in ('low','medium','high')),
 assignee_id uuid references auth.users(id), start_date date,due_date date,
 document_id uuid,revision_id uuid,annotation_id uuid,
 pause_reason text not null default '' check(length(pause_reason)<=2000),
 archived boolean not null default false,
 created_by uuid not null default auth.uid() references auth.users(id),author_name text not null default '',
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 completed_at timestamptz,completed_by uuid references auth.users(id),
 unique(id,project_id),
 foreign key(document_id,project_id) references public.documents(id,project_id),
 foreign key(revision_id,document_id,project_id) references public.document_revisions(id,document_id,project_id),
 foreign key(annotation_id,revision_id,project_id) references public.document_annotations(id,revision_id,project_id),
 check(revision_id is null or document_id is not null),check(annotation_id is null or revision_id is not null),
 check(start_date is null or due_date is null or due_date>=start_date),
 check(stage<>'paused' or length(btrim(pause_reason))>0),
 check((stage='done')=(completed_at is not null and completed_by is not null))
);
create index tasks_project_stage on public.project_tasks(project_id,archived,stage,created_at);
create index tasks_assignee on public.project_tasks(assignee_id);
create index tasks_document on public.project_tasks(document_id,project_id);
create index tasks_revision on public.project_tasks(revision_id,document_id,project_id);
create index tasks_annotation on public.project_tasks(annotation_id,revision_id,project_id);
create index tasks_creator on public.project_tasks(created_by);
create index tasks_completer on public.project_tasks(completed_by);
create table public.task_comments (
 id uuid primary key default gen_random_uuid(),project_id uuid not null,
 task_id uuid not null,body text not null check(length(btrim(body)) between 1 and 2000),
 created_by uuid not null default auth.uid() references auth.users(id),author_name text not null default '',
 created_at timestamptz not null default now(),
 foreign key(task_id,project_id) references public.project_tasks(id,project_id)
);
create index task_comments_task on public.task_comments(task_id,project_id,created_at);
create index task_comments_project on public.task_comments(project_id);
create index task_comments_creator on public.task_comments(created_by);
alter table public.project_tasks enable row level security;
alter table public.task_comments enable row level security;
revoke all on public.project_tasks,public.task_comments from public,anon,authenticated;
grant select on public.project_tasks,public.task_comments to authenticated;
grant insert(project_id,title,description,stage,priority,assignee_id,start_date,due_date,document_id,revision_id,annotation_id,pause_reason) on public.project_tasks to authenticated;
grant update(title,description,stage,priority,assignee_id,start_date,due_date,document_id,revision_id,annotation_id,pause_reason,archived) on public.project_tasks to authenticated;
grant usage on sequence public.project_tasks_task_number_seq to authenticated;
grant insert(project_id,task_id,body) on public.task_comments to authenticated;
create policy tasks_read on public.project_tasks for select to authenticated using(bkm_private.can_access_project(project_id));
create policy tasks_create on public.project_tasks for insert to authenticated with check(bkm_private.can_access_project(project_id,true) and created_by=(select auth.uid()));
create policy tasks_update on public.project_tasks for update to authenticated using(bkm_private.can_access_project(project_id,true)) with check(bkm_private.can_access_project(project_id,true));
create policy task_comments_read on public.task_comments for select to authenticated using(bkm_private.can_access_project(project_id));
create policy task_comments_create on public.task_comments for insert to authenticated with check(bkm_private.can_access_project(project_id,true) and created_by=(select auth.uid()) and exists(select 1 from public.project_tasks t where t.id=task_id and not t.archived));

create function bkm_private.task_stamp() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 if tg_op='INSERT' then
  if new.created_by<>auth.uid() then raise exception 'Autor inválido.' using errcode='42501';end if;
  select coalesce(nullif(full_name,''),'Participante') into new.author_name from public.user_profiles where id=auth.uid();
  new.author_name=coalesce(new.author_name,'Participante');
 else
  if (new.id,new.task_number,new.project_id,new.created_by,new.created_at,new.author_name) is distinct from (old.id,old.task_number,old.project_id,old.created_by,old.created_at,old.author_name) then raise exception 'Identidade e autoria são imutáveis.' using errcode='23514';end if;
  if old.archived and new.archived then raise exception 'Restaure a tarefa antes de alterá-la.' using errcode='23514';end if;
 end if;
 if new.assignee_id is not null and (tg_op='INSERT' or new.assignee_id is distinct from old.assignee_id) and not exists(select 1 from public.projects p where p.id=new.project_id and (p.owner_id=new.assignee_id or exists(select 1 from public.project_members m where m.project_id=p.id and m.user_id=new.assignee_id and m.role='editor'))) then raise exception 'O responsável deve ter permissão de edição neste projeto.' using errcode='23514';end if;
 if tg_op='INSERT' or (new.revision_id,new.annotation_id) is distinct from (old.revision_id,old.annotation_id) then
  if new.revision_id is not null and not exists(select 1 from public.document_revisions r where r.id=new.revision_id and r.project_id=new.project_id and r.document_id=new.document_id and r.upload_state='ready') then raise exception 'Selecione uma revisão com envio concluído.' using errcode='23514';end if;
  if new.annotation_id is not null and not exists(select 1 from public.document_annotations a where a.id=new.annotation_id and a.revision_id=new.revision_id and a.project_id=new.project_id and a.deleted_at is null) then raise exception 'A anotação não está disponível.' using errcode='23514';end if;
 end if;
 if new.stage='done' then
  if tg_op='INSERT' or old.stage<>'done' then new.completed_at=now();new.completed_by=auth.uid();end if;
 else new.completed_at=null;new.completed_by=null;end if;
 if new.stage<>'paused' then new.pause_reason='';end if;
 new.updated_at=now();return new;
end $$;
create function bkm_private.task_comment_stamp() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.created_by<>auth.uid() then raise exception 'Autor inválido.' using errcode='42501';end if;
 select coalesce(nullif(full_name,''),'Participante') into new.author_name from public.user_profiles where id=auth.uid();new.author_name=coalesce(new.author_name,'Participante');return new;
end $$;
revoke all on function bkm_private.task_stamp(),bkm_private.task_comment_stamp() from public,anon,authenticated;
create trigger tasks_stamp before insert or update on public.project_tasks for each row execute function bkm_private.task_stamp();
create trigger task_comments_stamp before insert on public.task_comments for each row execute function bkm_private.task_comment_stamp();
create trigger tasks_audit after insert or update on public.project_tasks for each row execute function bkm_private.audit_record();
create trigger task_comments_audit after insert on public.task_comments for each row execute function bkm_private.audit_record();

-- Project-scoped directory: names and roles only, never an organization user list.
create function bkm_private.project_people(p_project_id uuid) returns table(user_id uuid,display_name text,project_role text)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not bkm_private.can_access_project(p_project_id) then raise exception 'Acesso não autorizado.' using errcode='42501';end if;
 return query select u.id,coalesce(nullif(p.full_name,''),'Participante'),u.role from
 (select owner_id as id,'owner'::text as role from public.projects where id=p_project_id union select m.user_id,m.role from public.project_members m where m.project_id=p_project_id and m.user_id<>(select owner_id from public.projects where id=p_project_id)) u
 left join public.user_profiles p on p.id=u.id;
end $$;
revoke all on function bkm_private.project_people(uuid) from public,anon,authenticated;
grant execute on function bkm_private.project_people(uuid) to authenticated;
create function public.project_people(p_project_id uuid) returns table(user_id uuid,display_name text,project_role text) language sql security invoker set search_path='' as $$ select * from bkm_private.project_people(p_project_id); $$;
revoke all on function public.project_people(uuid) from public,anon,authenticated;
grant execute on function public.project_people(uuid) to authenticated;
